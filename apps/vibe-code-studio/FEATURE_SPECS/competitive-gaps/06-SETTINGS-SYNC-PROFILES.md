# Feature Spec: Settings Sync + Profiles

**Status**: 📋 PLANNED (MISSING — settings persist locally via `@tauri-apps/plugin-store`; no cross-machine sync, no named profiles)
**Priority**: MEDIUM
**Effort**: M — export/import is trivial; cloud sync + conflict handling is the real cost
**Competitor parity**: VS Code Settings Sync (Microsoft account) + Profiles (named, switchable bundles)
**Dependencies**: `@tauri-apps/plugin-store`, `src/services/GitHubService.ts` (Gist-backed sync option), `src/services/DatabaseService.ts` (better-sqlite3, profile storage), `@vibetech/auth` (identity for backend-sync option)

---

## User Story

As a developer working across two machines (desktop + laptop), I want my VCS settings, keybindings, enabled plugins, and theme to sync automatically, and I want to switch between named profiles (e.g. "Client A — strict lint" vs "Personal — relaxed"), so that I don't manually re-configure the editor every time I switch machines or contexts.

## Why VCS lacks this today

Settings currently live in a single local `@tauri-apps/plugin-store` JSON blob per machine, with no serialization contract, no remote backend, and no concept of more than one settings bundle. There is no merge or conflict-resolution logic because there has never been a second copy to conflict with.

This matters for a solo developer running a desktop + laptop split (or any multi-machine setup): every plugin toggle, keybinding tweak, and theme choice made on one machine is invisible to the other. Re-establishing parity after a fresh install is manual, error-prone, and easy to forget entirely.

## Acceptance Criteria

1. ⬜ "Export Settings" produces a single JSON file containing settings, keybindings, enabled-plugin IDs, and UI layout state, versioned with a schema number
2. ⬜ "Import Settings" reads that JSON, validates the schema version, and applies it (with a preview diff before committing)
3. ⬜ Settings Sync can be enabled with one of two backends: (A) a private GitHub Gist owned by the user's token, (B) the monorepo's own backend via `@vibetech/auth` identity — user picks per-workspace or globally
4. ⬜ Sync runs on settings-change (debounced) and on app start (pull-then-merge), not just on manual trigger
5. ⬜ Conflicts (both local and remote changed since last sync) trigger a **last-write-wins default** with a visible conflict prompt offering "keep mine / take theirs / merge manually" — never a silent overwrite
6. ⬜ Sensitive fields (API keys, tokens) are excluded from the synced payload by default, with an explicit opt-in per field
7. ⬜ Profiles are named, switchable bundles scoping: settings, keybindings, enabled-plugin set, and active theme
8. ⬜ Profile switcher lives in Settings as a dropdown; switching reloads the relevant stores without an app restart
9. ⬜ A workspace can declare a `defaultProfile` in `.vcs/workspace.json` so opening that folder auto-activates the right profile
10. ⬜ Deleting the active profile falls back to a built-in "Default" profile, never leaves the app in a profile-less state

## Architecture / Solution

Two independent layers that share one serialization format.

**Serialization** — a single `SettingsBundle` JSON shape:

```json
{
  "schemaVersion": 1,
  "settings": { "editor.fontSize": 14, "...": "..." },
  "keybindings": [{ "command": "workbench.action.files.save", "key": "ctrl+s" }],
  "enabledPlugins": ["plugin-id-a", "plugin-id-b"],
  "theme": "vcs-dark-plus",
  "excludedKeys": ["ai.openrouter.apiKey"]
}
```

`SettingsSerializer.export()` / `.import()` read/write this against the existing `@tauri-apps/plugin-store` instance — no new storage engine for local state.

**Sync backend** — pluggable interface, two implementations:

- **Gist backend**: reuse `GitHubService`'s authenticated Octokit-style client to create/update a private Gist named `vcs-settings-sync.json`. Poll on interval + push on debounced change. Gist revision history gives free version history for rollback.
- **Vibetech backend**: `@vibetech/auth` identity → POST/GET against a monorepo settings-sync endpoint (new, out of scope for this spec — assume a REST contract `{GET,PUT} /settings-sync/{userId}`).

Both implement `SettingsSyncBackend { pull(): Promise<SettingsBundle | null>; push(bundle): Promise<void>; getRemoteVersion(): Promise<number> }`. `SettingsSyncService` owns the debounce/merge/conflict logic and is backend-agnostic.

**Profiles** — data model lives in `DatabaseService` (better-sqlite3), one row per profile:

```
profiles(id TEXT PK, name TEXT, settings_json TEXT, keybindings_json TEXT,
          enabled_plugins_json TEXT, theme TEXT, created_at INTEGER, updated_at INTEGER)
```

Switching a profile = load its row, apply the same `SettingsBundle` shape into the live `@tauri-apps/plugin-store` instance, and broadcast a `profile-changed` event so stores (theme, keybinding manager, plugin manager) re-hydrate.

**Conflict resolution flow** in detail: on every sync pull, `SettingsSyncService` compares the remote bundle's `schemaVersion` + a monotonic `revision` counter against the last-synced local revision it cached. Three outcomes:

- Remote revision == last-synced local revision → no local changes since last sync → apply remote silently
- Remote revision > last-synced AND no local changes since → fast-forward, apply remote silently
- Both remote and local advanced independently → genuine conflict → surface the prompt; default action on prompt timeout/dismiss is "keep mine" (never silently take remote), consistent with a solo-developer bias toward not losing local work

## Implementation (phased)

### Phase 1 — Export/import settings JSON

- `src/services/settings/SettingsSerializer.ts`: `export()`/`import()` against `@tauri-apps/plugin-store`
- "Export Settings" / "Import Settings" buttons in `Settings.tsx`, native file save/open dialog via `@tauri-apps/plugin-dialog`
- Schema version check + diff preview modal before import commit

### Phase 2 — Cloud sync + conflict handling

- `src/services/settings/SettingsSyncService.ts` + `SettingsSyncBackend` interface
- `GistSyncBackend.ts` (wraps `GitHubService`) as the default backend — no new auth flow needed, users already connect GitHub for the Git panel
- Debounced push (2s idle) + pull-on-launch; conflict prompt modal (`keep mine / take theirs / merge`)
- Excluded-keys list (API keys, tokens) enforced at serialization time, not just UI-hidden

### Phase 3 — Profiles + per-workspace auto-activation

- `profiles` table in `DatabaseService`; CRUD service `src/services/settings/ProfileService.ts`
- Profile switcher dropdown in `Settings.tsx`
- `.vcs/workspace.json` → `defaultProfile` field; `WorkspaceManager` checks it on folder open and calls `ProfileService.activate(id)`

## Integration points (existing code to hook into)

- `src/components/Settings.tsx` — add Export/Import buttons, Sync toggle + backend picker, Profile switcher dropdown
- `@tauri-apps/plugin-store` — existing local settings persistence, read/written by the serializer unchanged
- `@vibetech/auth` — identity provider for backend-B sync option
- `src/services/DatabaseService.ts` — new `profiles` table alongside existing better-sqlite3 tables
- `src/services/GitHubService.ts` — reused (not extended) for the Gist sync backend's auth + API calls

## Test Scenarios

- Vitest: `SettingsSerializer.test.ts` — export → import round-trip produces an identical bundle (excluding excluded-keys)
- Vitest: `SettingsSyncService.test.ts` — mock backend, simulate concurrent local+remote change, assert conflict prompt fires (not silent overwrite)
- Vitest: `ProfileService.test.ts` — create/switch/delete profile, assert delete-active-profile falls back to Default
- Playwright: Export Settings → modify a setting → Import Settings → assert original value restored
- Playwright: create two profiles with different themes → switch between them → assert theme applies without app restart

## Success Metrics

- Sync round-trip (local change → Gist push → second-machine pull) completes within 10s under normal network conditions
- Zero silent data loss across 100 simulated conflict scenarios in test harness (every conflict either auto-resolves per last-write-wins rule or prompts)
- Profile switch completes in < 200ms (no visible flash/reflow beyond expected theme repaint)
- Excluded-keys enforcement: 0 sensitive-field leaks across a fuzz test injecting known API-key-shaped strings into arbitrary settings paths before serialization
- Import preview diff renders for bundles up to 500 settings keys in < 100ms (no perceptible UI stall opening the diff modal)

## Windows-specific notes

- `@tauri-apps/plugin-store` file path resolves under `%APPDATA%\vibe-code-studio\` by default; export/import file dialogs default to that directory for discoverability
- Gist sync backend requires a GitHub PAT or OAuth token with `gist` scope — reuse whatever `GitHubService` already prompts for when the Git panel first authenticates, do not add a second credential prompt
- Profile storage in `DatabaseService` (better-sqlite3) lives under `D:\` per the workspace's data-location convention, not `C:\`, consistent with how VCS's other local databases are placed

---

**Risks / Open questions**: Backend B (`@vibetech/auth` REST sync) requires a server endpoint that doesn't exist yet — Phase 2 should ship Gist-only first and treat backend B as a stretch goal gated on monorepo backend capacity. Merge-manually UI (three-way diff) is deferred past Phase 2; last-write-wins + prompt is the real v1 behavior.
**Sequencing**: Wave 1. No hard dependency on other specs; can ship independently and in parallel with #01/#02/#03.
