# Windows Code Signing Guide (Tauri)

This project packages Windows installers with Tauri 2. Signing is optional for local development and required only when your release policy or channel demands signed artifacts.

## What this repo supports

- **Unsigned builds (default):** no secrets required; packaging still works.
- **Readiness checks:** `scripts/check-windows-signing-readiness.ps1` reports whether signing is configured and ready.
- **Optional enforcement:** pass `-RequireSigning` (or set `VCS_REQUIRE_WINDOWS_SIGNING=true`) to fail release verification when signing is not ready.

## Supported signing modes

### 1) Certificate thumbprint mode (local cert store + signtool)

Set values under `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

Optional environment override:

- `TAURI_WINDOWS_SIGNTOOL_PATH` to point Tauri to a specific `signtool.exe`.

### 2) Custom sign command mode (for Azure/relic/trusted-signing-cli)

Set `bundle.windows.signCommand` in `src-tauri/tauri.conf.json`, for example:

```json
{
  "bundle": {
    "windows": {
      "signCommand": "trusted-signing-cli -e https://<endpoint> -a <account> -c <profile> -d VibeCodeStudio %1"
    }
  }
}
```

For Azure-backed sign commands, configure runtime credentials in env/CI secrets:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

## Certificate material and secrets

Never commit certificate files or secret values. Keep them in local machine stores or CI secrets.

Common CI pattern for cert import:

- `WINDOWS_CERTIFICATE` (base64 `.pfx`)
- `WINDOWS_CERTIFICATE_PASSWORD`

Use these in workflow steps that decode/import certs into `Cert:\CurrentUser\My` before running `tauri build`.

## Readiness + verification commands

Run readiness report:

```bash
pnpm run verify:windows-signing
```

Require signing readiness:

```bash
pnpm run verify:windows-signing -- -RequireSigning
```

Full release verification with required signing:

```bash
VCS_REQUIRE_WINDOWS_SIGNING=true pnpm run verify:production-build
```

Manual signature verification on built artifacts:

```powershell
signtool verify /pa /v "<path-to-installer-or-exe>"
```

## Notes and caveats

- Tauri Windows packaging can emit both `.msi` (WiX) and NSIS setup executables.
- MSI creation is Windows-only.
- Timestamp URLs should be configured for long-term signature validity.
- If signing config is absent, release scripts continue with unsigned artifacts unless strict mode is enabled.

## References

- [Tauri: Windows code signing](https://v2.tauri.app/distribute/sign/windows/)
- [Tauri: Windows installer packaging](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri environment variables](https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/reference/environment-variables.mdx)
- [Microsoft SignTool docs](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
