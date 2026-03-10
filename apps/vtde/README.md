# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Troubleshooting Nx ACL errors

If Nx fails with `Access is denied (os error 5)` while writing `.nx/workspace-data`, repair ACLs:

```powershell
$user = "$env:USERDOMAIN\$env:USERNAME"
icacls "C:\dev\.nx\workspace-data" /inheritance:r /grant:r "${user}:(OI)(CI)F" "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" /T /C
icacls "C:\dev\.pytest_cache" /inheritance:r /grant:r "${user}:(OI)(CI)F" "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" /T /C
```
