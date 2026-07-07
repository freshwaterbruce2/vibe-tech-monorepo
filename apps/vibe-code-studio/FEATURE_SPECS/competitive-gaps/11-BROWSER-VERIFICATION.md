# Feature Spec: Browser Verification (`/browser`)

**Status**: 📋 PLANNED (MISSING — VCS has `ImageToCodeService` for screenshot-to-code, the reverse direction; there is no agent-driven browser control or automated UI verification)
**Priority**: HIGH
**Effort**: L (3-6wk) — CDP/Playwright sidecar plumbing, permission gating, and the full self-verification loop are each non-trivial; Phase 1 alone is M
**Competitor parity**: Antigravity `/browser` — permissioned, real Chrome control with self-verification screenshots
**Dependencies**: `playwright` (Node, run as a Tauri sidecar) or `chrome-remote-interface` (CDP), `@tauri-apps/plugin-shell` for sidecar spawn, existing `TerminalService`, spec 09 (walkthrough/screenshot artifacts)

---

## User Story

As a developer whose agent just edited a UI component, I want the agent to open a real browser, exercise the changed feature, and show me screenshots and console/network output proving it works, so that I can trust the change without manually starting the dev server and clicking through it myself.

## Why VCS lacks this today

`ImageToCodeService` converts a screenshot _into_ code — there is no code-path that goes the other way: driving a live browser from agent actions, reading its console/network state, or capturing verification screenshots. `PreviewPanel.tsx` renders a preview iframe but is not agent-controllable and has no CDP/automation hook. `TerminalService` can start a dev server but nothing today opens a browser against it and drives interactions.

## Acceptance Criteria

1. ⬜ A `/browser` capability is invocable from Agent Mode, gated by an explicit user permission prompt before any browser session starts (no silent launches).
2. ⬜ The browser session runs via a Tauri sidecar process (Playwright or a CDP client) launched through `@tauri-apps/plugin-shell`, not embedded in the main Rust process.
3. ⬜ Supported actions: navigate to URL, click by selector/text, type into an input, and take a full-page or element screenshot.
4. ⬜ Console messages and network request/response summaries are captured during the session and made available to the agent as structured data (not just raw log text).
5. ⬜ A session can be recorded (video or screenshot sequence) and the recording saved to `.vcs/artifacts/recordings/`.
6. ⬜ Screenshots captured during a session are written to `.vcs/artifacts/screenshots/` and registered as `screenshot`-kind artifacts (spec 09).
7. ⬜ After a UI-affecting code edit, the agent can autonomously: start the dev server via `TerminalService`, wait for it to be ready, open a permissioned browser session, navigate to the affected route, and capture before/after screenshots.
8. ⬜ The autonomous verification run emits a `walkthrough` artifact (spec 09) summarizing what was checked and embedding the captured screenshots.
9. ⬜ The user can revoke browser permission mid-session, immediately terminating the sidecar process.
10. ⬜ Failures (selector not found, navigation timeout, console errors detected) are surfaced back to the agent as structured results it can react to, not just thrown exceptions.
11. ⬜ Each browser action taken by the agent (navigate, click, type) is logged in human-readable form in the task's execution log, so a reviewer can see the interaction sequence without replaying the recording.
12. ⬜ The permission prompt scopes consent to a single session with a visible expiry/end condition (task completion or explicit user stop) — there is no "always allow" that silently persists across unrelated future tasks.

## Architecture / Solution

Browser control runs as an isolated Tauri sidecar — either a small Node script wrapping Playwright, or a thin CDP client (`chrome-remote-interface`) driving a locally installed/downloaded Chromium — spawned via `@tauri-apps/plugin-shell`'s `Command.sidecar()`. This keeps a full browser automation stack out of the Rust binary and matches VCS's existing sidecar pattern for external tooling. The sidecar communicates with the webview over stdio (JSON-RPC-style request/response), the same integration shape as any other Tauri sidecar in the app.

Keeping the browser automation stack in a sidecar rather than the Rust core matters for two reasons beyond convention: it lets Phase 1 ship with Playwright's Node runtime without touching the Tauri core's dependency tree, and it means a crashed or hung browser session (a real risk with any CDP-driven automation) takes down only the sidecar process, not the editor itself. The webview never talks to Chromium directly — every action is mediated by `BrowserSidecarClient`, which is also where the permission gate lives, so there is exactly one code path capable of spawning a browser.

```
Agent (webview, EnhancedAgentMode)
   -> requests /browser action
   -> permission gate (user approves session start) — new PermissionPrompt component
   -> BrowserSidecarClient (src/services/browser/)
        -> Command.sidecar('browser-agent').spawn()
        -> stdio JSON messages: { action: 'navigate', url } / { action: 'click', selector } / ...
   -> sidecar (Playwright or CDP) executes against a real Chromium instance
        -> returns { screenshot: path } | { console: [...] } | { network: [...] } | { error }
   -> BrowserSidecarClient writes screenshots to .vcs/artifacts/screenshots/
   -> ArtifactService.record('screenshot', taskId, path)   [spec 09]

Self-verification loop (Phase 3)
   TerminalService.run('pnpm dev') -> wait for ready signal (port/health check)
   -> BrowserSidecarClient.navigate(devServerUrl + affectedRoute)
   -> capture screenshot, read console errors
   -> ArtifactService.generateWalkthrough(taskId) includes verification results
```

Permission gating is enforced at the `BrowserSidecarClient` boundary: no sidecar spawn happens without a resolved user-approval promise, and the approval UI states what the agent intends to do (navigate to X, on behalf of task Y) before the user confirms — mirroring the explicit-consent pattern implied by Tauri's own capability/permission model for sidecars.

**Protocol/data model** (stdio message shape between webview and sidecar, and the artifact-facing result type):

```ts
// Request: webview -> sidecar (stdin, one JSON object per line)
type BrowserAction =
  | { action: 'navigate'; url: string }
  | { action: 'click'; selector: string }
  | { action: 'type'; selector: string; text: string }
  | { action: 'screenshot'; fullPage?: boolean };

// Response: sidecar -> webview (stdout, one JSON object per line)
interface BrowserActionResult {
  ok: boolean;
  screenshotPath?: string;
  consoleMessages?: { level: string; text: string }[];
  networkSummary?: { url: string; status: number; method: string }[];
  error?: { code: string; message: string };
}
```

This request/result pair is the entire surface `BrowserSidecarClient` exposes upward — the agent's planning layer never talks to Playwright/CDP types directly, only to this typed contract, which keeps the sidecar swappable (Playwright now, a lighter CDP client later) without touching call sites.

## Implementation (phased)

### Phase 1 — Permissioned sidecar + navigate/click/screenshot

Add `src/services/browser/BrowserSidecarClient.ts` and the sidecar script itself (Playwright preferred for cross-action reliability over raw CDP). Add the sidecar binary declaration to Tauri's config (`tauri.conf.json` sidecar externalBin entry) and a `PermissionPrompt` component gating session start. Implement `navigate`, `click`, `type`, `screenshot` actions only. Ship with a hard-coded action allowlist (no arbitrary JS execution in the browser context) to keep the initial permission surface reviewable.

### Phase 2 — Console/network capture + recording

Extend the sidecar to attach Playwright's `page.on('console')` and `page.on('request'/'response')` listeners (or CDP `Console`/`Network` domains if using raw CDP), streaming structured events back over stdio. Add screen recording (Playwright's built-in video capture, or periodic screenshot capture as a fallback) saved to `.vcs/artifacts/recordings/`. Network summaries are capped (URL, method, status only) rather than capturing full request/response bodies, to avoid accidentally persisting sensitive payloads to disk.

### Phase 3 — Autonomous post-edit verification loop -> walkthrough

Add a verification orchestrator that: detects a completed UI-affecting task (heuristic: diff touches `.tsx`/`.css`/styled-components files), starts the dev server via `TerminalService`, waits for readiness, drives the sidecar through navigate+screenshot, and calls `ArtifactService.generateWalkthrough()` (spec 09) with the results attached. This phase still requires a permission prompt before its first browser action — "autonomous" describes the agent's decision to verify, not a bypass of user consent.

## Integration points (existing code to hook into)

- new `src/services/browser/` — houses `BrowserSidecarClient.ts` and the sidecar script; no existing browser-control code to extend, this is net-new.
- `src/services/TerminalService.ts` — starts/monitors the dev server the verification loop navigates against.
- spec 09 (`09-VERIFIABLE-ARTIFACTS.md`) — `screenshot` and `walkthrough` artifact kinds are the output contract for this spec.
- `src/components/EnhancedAgentMode/` — surfaces the `/browser` invocation and the `PermissionPrompt` gate within the agent's action stream.
- `src/components/PreviewPanel.tsx` — natural place to optionally mirror the controlled browser's current view, or at minimum share dev-server-URL resolution logic.
- `src/services/ImageToCodeService.ts` — no code reuse expected (opposite direction), but screenshot file-handling conventions (paths, formats) should stay consistent with what this service already produces/consumes.

## Test Scenarios

- Vitest: `BrowserSidecarClient` refuses to spawn the sidecar when permission promise is unresolved/rejected.
- Vitest: the action allowlist (Phase 1) rejects any `BrowserAction` variant not in `{navigate, click, type, screenshot}`, even if the sidecar script itself would otherwise support it.
- Vitest: stdio message parser correctly decodes a sequence of `{action, result}` JSON frames from a mocked sidecar stdout stream, including an error frame.
- Vitest: verification-loop heuristic correctly flags a diff containing only `.tsx` changes as UI-affecting and skips a diff containing only `.md` changes.
- Vitest: permission scope expires and blocks further sidecar actions once the originating task reaches `completed`, even if the sidecar process technically remains alive.
- Playwright (meta: testing the tester): launch the app, trigger `/browser` on a fixture task, approve the permission prompt, assert a screenshot file appears under `.vcs/artifacts/screenshots/` and a corresponding artifact row exists.
- Playwright: revoke permission mid-session; assert the sidecar process is no longer listed in `dc_list_processes`-equivalent process check / `Command` child handle reports terminated.
- Playwright: run the autonomous verification loop against a fixture app with an intentional console error on the affected route; assert the resulting walkthrough artifact flags the console error rather than silently passing.
- Vitest: `BrowserActionResult` parser rejects a malformed sidecar response (missing `ok` field) as a protocol error rather than passing it through to the agent uninterpreted.

## Success Metrics

- Sidecar crash/hang rate stays low enough that it does not degrade trust in the editor's own stability — tracked separately from editor crash telemetry precisely because the sidecar isolation (Acceptance Criterion 2) is supposed to prevent bleed-through.
- 100% of browser sessions are preceded by a logged, resolved permission approval (zero silent launches, audited).
- % of UI-affecting agent tasks that produce a verification walkthrough reaches target (>70%) within a few releases of Phase 3 shipping.
- False-positive rate of the "UI-affecting" heuristic (walkthroughs generated for non-visual changes) stays low via manual spot-check.
- Median time from task-completed to verification-walkthrough-available stays low enough that it does not become the bottleneck in the review loop (target: under the time it takes a human to manually open a browser and check).
- Zero sidecar processes remain alive after their originating task completes or is stopped, verified by a process-count check at end of session (guards against the permission-revocation cleanup path silently failing).

---

**Risks / Open questions**: Chromium distribution — bundling a full browser via Playwright increases installer size significantly; evaluate "use system-installed Chrome via CDP" as a lighter-weight alternative for Phase 1 before committing to Playwright's bundled browsers. Sidecar stdio protocol needs a concrete schema decision (raw JSON lines vs. length-prefixed frames) before Phase 1 implementation starts. Recording storage growth needs the same retention policy called out in spec 09.
**Sequencing**: Wave 2-3, hard dependency on spec 09's artifact model existing first (screenshots/walkthroughs need somewhere to land). Independent of spec 10. Highest differentiation value of the four specs but also the largest net-new surface area.
