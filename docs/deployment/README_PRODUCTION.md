# Vibe-Tech Production Stability Protocol

This README_PRODUCTION.md serves as the definitive guide for maintaining the stability and portability of the Vibe-Tech ecosystem (Nova Agent, Code Studio, and Justice).

By following these protocols, we ensure that our high-performance requirements (local LLMs, Vector Stores) do not compromise the "Works on My Machine" threshold for end-users.

## 1. The "Native Binary" Golden Rule

Because we utilize `better-sqlite3` and `onnxruntime-node`, we are subject to strict Node.js ABI (Application Binary Interface) matching.

*   **Rule:** Never commit a build without running the rebuild script.
*   **Command:** `npm run postinstall` (Root)
*   **Why:** This forces `electron-rebuild` to download the correct headers for the Electron version, preventing the "NODE_MODULE_VERSION" mismatch crash on launch.

## 2. Storage Strategy: Tiered Discovery

The "D: Drive" is no longer a hard requirement, but a performance preference.

| Tier | Location | Trigger |
| :--- | :--- | :--- |
| **Tier 1 (Optimized)** | `D:\vibe-tech` | Physical D: drive exists + Write Access. |
| **Tier 2 (Safe)** | `%APPDATA%\vibe-tech-local` | D: drive missing or read-only. |

*   **Logic Location:** `packages/shared-utils/src/path-registry.ts`
*   **Developer Action:** Always use `getIntelligencePath()` or `getStoragePath()` from shared-utils. **Never hardcode "D:" in application logic.**

## 3. ASAR and VFS Isolation

Electron packages files into an encrypted `.asar` archive. C++ binaries (`.node`) and Shared Libraries (`.dll`) **cannot** be executed from inside this archive.

*   **Extraction:** Our `electron-builder.yml` is configured with `asarUnpack`.
*   **Runtime Pathing:** Native modules are marked as `external` in `electron.vite.config.ts`.
*   **Path Reference:** In production, binaries move to `resources/app.asar.unpacked`. If adding a new native module, you must add it to the `asarUnpack` list in the app's configuration.

## 4. Mandatory Deployment Workflow

Before pushing any production-ready branch, developers must pass the **Sanity Gate**:

1.  **Rebuild:** `npm run postinstall`
2.  **Compile:** `npm run build:production`
3.  **Validate:** `ts-node scripts/vibe-check-binaries.ts`

If this script fails (**Red output**), the build is hollow and will crash. **Do not deploy.**

## 5. Troubleshooting the "Silent Crash"

If the application launches and immediately vanishes without a window:

1.  **Check the Logs:** Navigate to `%APPDATA%/[AppName]/logs/main.log`.
2.  **Powershell Launch:** Run the `.exe` via PowerShell with `--enable-logging`.
3.  **Look for:** `Error: The module '\\?\...xxx.node' was compiled against a different Node.js version.`
4.  **Check DLLs:** Use the Sanity Check script to ensure `onnxruntime.dll` exists in the unpacked folder.

---

**Architect's Note:** Our goal is to balance the raw power of local AI with the reliability of a standard desktop application. Respect the `PathRegistry`, and the system will respect the hardware.
