# Tauri Code Signing & Updater — Decision Record

**Status:** Deferred (Wave 1D, 2026-04-22)
**Re-evaluate when:** First external release or `v1.0.0` tag is cut.

## Decision

Code signing and the `tauri-plugin-updater` integration are intentionally **not**
configured in this branch. The Tauri v2 hardening in Wave 1D covered CSP, scoped
capabilities, and awaited sidecar termination — but stopped short of wiring a
signing certificate or an update channel.

## Rationale

- Builds today are **private, development-only**. They ship to a single
  workstation (`D:\data\vibe-justice`) and are not distributed via any update
  server, install endpoint, or package registry.
- Acquiring and managing an EV code-signing certificate is a non-trivial
  operational commitment (vendor choice, HSM/cert storage, CI secret hygiene,
  rotation). Doing it before we have a distribution story is premature.
- `tauri-plugin-updater` requires:
  - A signed public key pair (`tauri signer generate`),
  - A hosted `latest.json` manifest behind HTTPS,
  - A build pipeline that publishes signed bundles on release.
  None of these exist yet, so enabling the plugin now would either ship dead
  code or leak placeholder URLs into shipped binaries.

## Re-evaluation trigger

Cut code-signing + updater work as soon as either is true:

1. The first external user (non-developer) is targeted for distribution.
2. A `v1.0.0` or other public release tag is created.

At that point, open a dedicated task and work through the
[Tauri v2 Windows signing guide](https://v2.tauri.app/distribute/sign/windows/)
and [updater plugin docs](https://v2.tauri.app/plugin/updater/) end-to-end.

## References

- Tauri v2 Windows signing: https://v2.tauri.app/distribute/sign/windows/
- Tauri v2 updater plugin: https://v2.tauri.app/plugin/updater/
- Wave 1D commit (CSP / capability scoping / sidecar kill): `a31ef8c`
