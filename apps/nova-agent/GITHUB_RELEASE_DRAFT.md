## Nova Agent v1.3.0

**Production-ready Windows desktop AI assistant.**

Nova Agent v1.3.0 ships with a fully hardened CI pipeline, zero audit advisories in the dependency tree, and fresh Windows installers (MSI + NSIS). This release replaces the external ChromaDB dependency with an in-process LanceDB RAG pipeline, completes GravityClaw voice integration, and closes the Jan 31 CSS regression with permanent regression guards.

### Install

**MSI Installer (Recommended — Windows Installer)**
```powershell
# Double-click or run via PowerShell
.\NOVA Agent_1.3.0_x64_en-US.msi
```
Silent install for enterprise deployment:
```powershell
msiexec /i "NOVA Agent_1.3.0_x64_en-US.msi" /qn
```

**NSIS Installer (Alternative — Setup Executable)**
```powershell
.\NOVA Agent_1.3.0_x64-setup.exe
```

### Assets

| File | Size | SHA-256 |
|------|------|---------|
| `NOVA Agent_1.3.0_x64_en-US.msi` | 25.6 MB | `41daecdff00aa297fe2f18cd1c4c92bbf73deec2bdee964fdd7d8c3f9893ed8b` |
| `NOVA Agent_1.3.0_x64-setup.exe` | 16.4 MB | `681977f63dd9079389a38317a0067d92ccf2e3444b5376c6df06eddac0745939` |

### Verification

Verify your download with PowerShell:
```powershell
# MSI
certutil -hashfile "NOVA Agent_1.3.0_x64_en-US.msi" SHA256

# NSIS
certutil -hashfile "NOVA Agent_1.3.0_x64-setup.exe" SHA256
```

Or with any SHA-256 tool and compare to the table above.

### What's New

- **Production-ready validation chain** — lint, typecheck, 183 unit tests, 7 browser tests, smoke test, and zero audit advisories all green.
- **CI pipeline** — `nova-agent.yml` (lint / typecheck / test / E2E / Tauri build) plus `nova-agent-visual.yml` (Stylelint + visual regression) guard every PR.
- **RAG v2** — LanceDB in-process pipeline with two-stage retrieval, HyDE query expansion, and cross-encoder reranker.
- **GravityClaw integration** — End-to-end voice I/O, task approval flow, retry + persistence.
- **Memory Architecture Unification** — All six phases complete; shared with `memory-mcp`.
- **Security fixes** — `vite`, `lodash-es`, and `uuid` dependency upgrades.
- **Jan 31 regression guard** — Playwright visual snapshots + CSS probe prevent future responsive-layout regressions.

### Known Issues

- 3 of 4 E2E visual tests have a flaky `waitForSelector` timeout against the notifications region. This is cosmetic and does not affect the shipped build.
- Frontend `three.js` chunk is ~1.3 MB. Dynamic `import()` code-splitting is planned for a future release.

### Requirements

- Windows 10/11 x64
- ~100 MB disk space (binary) / ~26 MB (MSI installer)

---

**Full release notes:** [`RELEASE_NOTES_v1.3.0.md`](./RELEASE_NOTES_v1.3.0.md)

*Built with Tauri 2.10.3, React 19, Vite 7.3.1, and Rust stable.*
