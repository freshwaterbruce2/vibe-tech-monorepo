# Feature Spec: Cloud / Remote Agent Runner

**Status**: 📋 PLANNED (PARTIAL — `BackgroundAgentSystem` runs agents locally/in-process only; `RemoteConnectionManager` manages remote _dev host_ SSH connections, not agent execution)
**Priority**: LOW-MEDIUM (infra-heavy; sequence last)
**Effort**: XL (2+mo) — containerized worker, streaming transport, and multi-surface triggers are all new infrastructure
**Competitor parity**: Cursor cloud/background agents — isolated VMs, triggered from web/GitHub/mobile, progress streamed back to the client
**Dependencies**: Docker, a self-hosted runner host (VM or the existing `D:\` box), `@vibetech/billing`, `@vibetech/entitlements`, GitHub webhooks

---

## User Story

As a developer, I want to kick off a long-running agent task (a large refactor, a multi-hour test-and-fix loop) from the IDE — or from a GitHub PR comment when I'm away from my desk — and have it run on a remote worker instead of tying up my local machine, with progress streamed back to VCS and a web dashboard, so that I can close my laptop and check results later.

## Why VCS lacks this today

`BackgroundAgentSystem` is in-process: it runs `ExecutionEngine` tasks on the same machine as the VCS window, queued with a `maxConcurrent` cap. There is no isolation boundary (a runaway agent task shares the local filesystem/process space), no way to trigger a run without VCS open, and no remote execution surface at all. `RemoteConnectionManager` is a false friend here — it's a singleton that manages saved SSH-style connections (`RemoteConnection { host, username, ... }`) for browsing/editing remote files, not for dispatching or supervising agent _execution_; it's reusable for its connection-lifecycle and event-transport patterns (`connect`/`disconnect`/`connection-change` events), not as an existing cloud-agent feature.

## Acceptance Criteria

1. ⬜ A containerized runner (Docker) can check out a repo+branch, install deps, and run the VCS agent stack headless (no GUI) against a task description
2. ⬜ The IDE can trigger a remote run ("Run in Cloud" alongside the existing local "Run" action) and receives a run ID immediately, non-blocking
3. ⬜ Run progress (step-by-step, matching `BackgroundAgentSystem`'s existing `progress`/`stepStart`/`stepComplete` event shape) streams back to the IDE in near-real-time
4. ⬜ Each remote run operates on a dedicated git branch, never pushing directly to the branch that triggered it, until the user explicitly merges/accepts
5. ⬜ A minimal web dashboard shows run status, streamed logs, and a diff of changes for runs not currently being watched from the IDE
6. ⬜ Isolation: each run gets its own container instance; no filesystem or process sharing between concurrent runs
7. ⬜ A GitHub issue/PR comment (e.g. `@vcs-agent fix this`) can trigger a remote run scoped to that PR's branch
8. ⬜ Remote run access is gated by `@vibetech/entitlements` (feature flag / plan check) and usage is metered through `@vibetech/billing`
9. ⬜ Runs have a hard wall-clock timeout and resource limits (CPU/memory) enforced at the container level, not just application-level
10. ⬜ A failed or timed-out run leaves no orphaned container and reports a clear failure state back to the IDE/dashboard, not a silent hang
11. ⬜ Secrets/credentials needed by a remote run (API keys, git tokens) are injected into the container at launch time via a scoped secret store, never baked into the image or logged in plaintext to the stream
12. ⬜ A user can list and manually terminate any of their own in-flight remote runs from either the IDE or the web dashboard, not just wait for timeout

## Example run event payload (mirrors `BackgroundTask` shape)

```typescript
// Streamed from RunnerAPI to IDE/dashboard, one event per BackgroundAgentSystem-equivalent transition
interface CloudRunEvent {
  runId: string;
  type: 'started' | 'progress' | 'stepStart' | 'stepComplete' | 'completed' | 'failed';
  progress?: number; // 0-100, same semantics as BackgroundTask.progress
  stepDescription?: string; // same semantics as BackgroundTask.stepDescription
  branch: string; // the dedicated branch this run is writing to
  timestamp: string;
}
```

Reusing `BackgroundTask`'s field names (`progress`, `stepDescription`) for `CloudRunEvent` is deliberate — it lets the IDE render remote and local runs through the same progress-bar/step-list UI components with a thin adapter, instead of building a second visual language for "this run happens to be remote."

## Architecture / Solution

Realistic solo-dev scope: **one self-hosted Docker runner**, not a fleet or a managed cloud service. This is infrastructure VCS talks to, not infrastructure VCS builds a scheduler for.

```
IDE "Run in Cloud" ──┐
Web dashboard trigger ┼──► RunDispatcher (new, thin) ──► RunnerAPI (new, on the Docker host)
GitHub comment ───────┘                                        │
                                                                  ▼
                                                  Container: clone repo, checkout branch,
                                                  run headless VCS agent stack (ExecutionEngine
                                                  equivalent, no GUI), write to a dedicated branch
                                                                  │
                                          stream logs/progress    ▼
                                          (reuse RemoteConnectionManager's
                                           connect/event-emitter transport pattern)
                                                                  │
                                                                  ▼
                                          IDE (live) + Web dashboard (polling/replay)
                                          gated by @vibetech/entitlements, metered via @vibetech/billing
```

The headless agent runtime inside the container is the _same_ `ExecutionEngine`/agent code VCS already runs locally — this spec does not fork the agent logic, only wraps it in a non-GUI entrypoint and a container image. `RunDispatcher` and `RunnerAPI` are new, but deliberately thin: dispatch a run, stream events back, nothing cleverer. `RemoteConnectionManager`'s existing connection-state/event-listener pattern (`Map<RemoteEvent, Set<RemoteEventHandler>>`, `connect`/`disconnect`, `emit`) is the template for the streaming transport, not literal reused code — it manages a different resource (SSH dev connections vs. run streams) but the shape is proven and worth mirroring.

## Implementation (phased)

### Phase 1 — Self-hosted Docker runner triggered from the IDE

- Dockerfile: headless VCS agent runtime (clone, deps, `ExecutionEngine` entrypoint, no GUI)
- `src/services/cloud/RunDispatcher.ts`: IDE-side, POSTs a run request to the runner host, returns a run ID
- Minimal `RunnerAPI` on the Docker host (could live on the monorepo Express 5 backend or a small standalone service): accept run requests, launch containers, expose a log/event stream endpoint
- IDE panel: "Run in Cloud" button, live-streamed progress reusing the same UI components `BackgroundAgentSystem` progress events already drive locally

### Phase 2 — Web dashboard + branch isolation

- Minimal web dashboard (could be a new small app in the monorepo, or a page on `vibetech-command-center`): run list, status, streamed logs, diff view
- Enforce dedicated-branch-per-run; no direct push to the triggering branch
- Container-level CPU/memory/wall-clock limits

### Phase 3 — GitHub-comment trigger + entitlement gating

- GitHub webhook listener (Express 5 backend) for `@vcs-agent`-style PR/issue comments, resolves to a `RunDispatcher` call scoped to that PR's branch
- `@vibetech/entitlements` check gates remote-run access (plan/feature flag) before dispatch
- `@vibetech/billing` metering hook records run duration/resource usage per account

## Integration points (existing code to hook into)

- `src/services/BackgroundAgentSystem.ts` — event shape (`progress`/`stepStart`/`stepComplete`/`completed`/`failed`) is the contract `RunDispatcher`'s streamed events should mirror, so the IDE can render remote and local runs with the same UI
- `src/services/RemoteConnectionManager.ts` — connection-lifecycle/event-listener pattern used as the template for the streaming transport (not literal code reuse — different resource type)
- `src/services/GitHubService.ts` — PR/issue comment webhook handling and branch operations for Phase 3
- `@vibetech/billing`, `@vibetech/entitlements` — gating and metering, Phase 3
- `src/services/specialized-agents/` — the actual agent implementations run headless inside the container, unchanged
- Monorepo Express 5 backend (port 5177) — plausible host for `RunnerAPI` and the GitHub webhook receiver, avoiding a second always-on service

## Test Scenarios

- Vitest: `RunDispatcher.test.ts` — mock `RunnerAPI`, assert a dispatched run returns a run ID immediately and doesn't block the caller
- Integration: build the Docker image, run it against a small fixture repo with a trivial task, assert it completes and produces a diff on a dedicated branch (not the trigger branch)
- Integration: kill a container mid-run, assert the IDE/dashboard surfaces a clear failure state within the timeout window, and no orphaned container remains (`docker ps` clean)
- Playwright: trigger "Run in Cloud" from the IDE, assert streamed progress events render in the same panel components used for local `BackgroundAgentSystem` runs
- Manual: post a GitHub PR comment trigger against a scratch repo, verify a scoped run starts and reports back to the PR
- Vitest: secret injection — assert a launched container receives credentials via environment/mounted secret file, and stream-captured logs never contain the raw secret value even under a deliberately verbose test task
- Playwright: list in-flight runs from the IDE, manually terminate one, assert its container is gone (`docker ps` clean) within a few seconds and the IDE reflects `failed`/`cancelled` state, not a hang

## Success Metrics

- Remote run start latency (trigger to container running) < 30s on the self-hosted runner
- Zero orphaned containers after 50 consecutive runs, including forced timeouts/failures
- Streamed progress latency (container event to IDE render) < 2s under normal network conditions
- Zero secret leakage into logs or the streamed event payload across the full test matrix

## Scope discipline note

Effort is rated XL specifically because it's tempting to over-build here — a "real" cloud agent platform implies autoscaling, multi-region, queueing fairness across users, and HA. None of that is in scope. This spec is one machine, one Docker daemon, a handful of concurrent containers, gated behind entitlements so it doesn't get hammered by unexpected usage. If usage ever outgrows one host, that's a follow-up spec, not a Phase 4 here — scope creep into "build a real fleet" is the single biggest risk to this spec ever shipping at all.

## Why sequence this last

Every other spec in this batch (03, 04, 15, 16) extends something that already runs inside the VCS process — a parser, a memory tier, a review pipeline, a scheduler glued to an existing MCP. This one is the only spec that stands up net-new always-on server infrastructure (a Docker host, a `RunnerAPI`, a web dashboard) that has to be operated and kept alive independently of VCS itself. That operational burden, not the coding effort alone, is why it's sequenced last: shipping specs 03/04/15/16 first de-risks and validates the agent stack this spec would run headless, before committing to hosting it remotely.

---

**Risks / Open questions**: This is the highest-effort, highest-infra-risk spec in the batch — a single self-hosted runner has no HA story; if the Docker host is down, all cloud runs fail with no fallback (acceptable for solo-dev scope, should be stated explicitly to avoid scope creep into a multi-node design). GitHub App permissions for Phase 3 (posting back to PRs, pushing branches) need scoping before implementation. `@vibetech/billing`/`@vibetech/entitlements` integration assumes those packages already expose the hooks this needs — verify their actual APIs before Phase 3, don't assume shape. Where does the secret store for Acceptance Criteria #11 live — a new small secrets service, or does `@vibetech/entitlements`/existing infra already have one to reuse?
**Sequencing**: Wave 4 (last). No other spec in this batch depends on this one; this one has no hard dependency on specs 03/04/15/16 but benefits from spec 16's scheduling groundwork (a "cloud + scheduled" run is a natural Phase 4 if pursued later).
