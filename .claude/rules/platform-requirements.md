# Platform Requirements

Priority: MANDATORY

## Windows 11 Only

All development targets Windows 11 exclusively. Do not suggest or implement cross-platform solutions unless the user explicitly requests it.

- OS: Windows 11 (build 22000+)
- Shell: PowerShell 7+ (pwsh.exe) — not bash, not cmd
- Paths: backslash (`\`), drive letters (`C:\`, `D:\`), case-insensitive NTFS
- Line endings: CRLF

## Path Conventions

- `C:\dev\` — all source code (apps, packages, backend)
- `D:\` — all data (databases, logs, learning-system, screenshots)

Never use Unix paths (`/home/user`, `/var/lib`). Never store data files in `C:\dev`.

## Required Build Tools

- Visual Studio Build Tools 2022 (native module compilation)
- Windows SDK 10/11 (Tauri, WinRT APIs)
- PowerShell 7+ (default shell)
- Node.js 22.x Windows x64
- Rust MSVC toolchain (Tauri/Rust projects)
- Python 3.x Windows x64 (crypto-enhanced)

## Exceptions

Web applications, API servers, and cross-platform npm packages may be platform-agnostic. Desktop applications are always Windows 11 only.
