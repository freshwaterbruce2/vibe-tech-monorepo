# Windows 11 Platform Requirements

Last Updated: 2026-01-07
Enforcement: MANDATORY
Scope: ALL desktop applications in monorepo

## Core Requirement

**ALL development in this monorepo targets Windows 11 exclusively.**

This is NOT a cross-platform project. Do not suggest or implement cross-platform solutions unless explicitly requested.

## Platform Specifications

### Operating System

- **Required**: Windows 11 (build 22000 or higher)
- **NOT Supported**: Windows 10, Linux, macOS, WSL1, WSL2

### Shell Environment

- **Primary**: PowerShell 7+ (pwsh.exe)
- **Secondary**: PowerShell 5.1 (powershell.exe) for compatibility
- **NOT Used**: bash, zsh, cmd.exe (except legacy scripts)

### File System Conventions

- **Path Separators**: Backslash (\\) - use path.join() in Node.js
- **Drive Letters**: C:\\ for code, D:\\ for data
- **Case Sensitivity**: Case-insensitive (NTFS default)
- **Line Endings**: CRLF (\\r\\n) - configured in .gitattributes

## Desktop Applications (Windows 11 Only)

### nova-agent (Tauri)

- Target: Windows 11 x64
- Installer: .msi and .exe
- Features: WinRT, Win32 APIs

### vibe-code-studio (Electron)

- Target: Windows 11 x64
- Installer: .exe (NSIS)
- Features: Windows native integrations

### desktop-commander-v3 (MCP Server)

- Target: Windows 11 x64
- Features: PowerShell execution, Windows automation
- Dependencies: systeminformation (Windows-optimized)

## Development Tools (Windows 11)

### Required Tools

- **Visual Studio Build Tools 2022** - Native module compilation
- **Windows SDK 10/11** - Tauri and native APIs
- **PowerShell 7+** - Default shell
- **Node.js 22.x (Windows x64)** - JavaScript runtime
- **Rust (MSVC toolchain)** - Tauri/Rust projects
- **Python 3.x (Windows x64)** - crypto-enhanced

### Windows-Specific Commands

```powershell
# ✅ PowerShell preferred
Get-Process
Get-ChildItem
Test-Path
Remove-Item

# ❌ NOT bash equivalents
# ps, ls, test, rm
```

## Path Conventions

### Code Storage (C:\\dev)

```
C:\\dev\\                  # All source code
├── apps\\                # Applications
├── packages\\            # Shared libraries
└── backend\\             # Backend services
```

### Data Storage (D:\\)

```
D:\\                      # Data partition
├── learning-system\\     # AI learning data
├── databases\\           # SQLite databases
├── logs\\                # Application logs
└── screenshots\\         # Desktop-commander-v3
```

**NEVER use Unix paths** like /home/user or /var/lib

## Build Configurations

### TypeScript

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "paths": {
      "@/*": ["./src/*"]  // Windows path mapping
    }
  }
}
```

### Vite

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // Uses Windows paths
    }
  }
})
```

### Electron

```javascript
// electron/main.ts
const isDev = process.platform === 'win32' && !app.isPackaged;
```

## Testing Considerations

### Unit Tests

- Run on Windows 11 only
- Use PowerShell for test scripts
- Mock Windows APIs appropriately

### E2E Tests (Playwright)

- Launch browsers on Windows 11
- Test Windows-specific UI behaviors
- WebView2 on Windows (not WebKit)

### Performance Tests

- Windows 11 performance characteristics
- NTFS file system benchmarks
- Windows process memory model

## CI/CD Pipelines

### GitHub Actions

```yaml
jobs:
  build:
    runs-on: windows-latest  # Windows Server (Windows 11 compatible)
    steps:
      - uses: actions/checkout@v4
      - name: Setup PowerShell
        shell: pwsh
        run: |
          Write-Host "Running on Windows"
```

### Local Development

- Run builds on Windows 11 machine
- Test installers on Windows 11
- No Docker for desktop apps (Windows containers not required)

## Prohibited Practices

### DO NOT

- ❌ Suggest Linux/macOS alternatives
- ❌ Use bash-specific syntax
- ❌ Implement POSIX-only features
- ❌ Add cross-platform abstractions (unless requested)
- ❌ Test on non-Windows platforms
- ❌ Use forward slashes in native paths
- ❌ Suggest WSL for development

### DO

- ✅ Use PowerShell for scripts
- ✅ Use Windows APIs directly
- ✅ Assume Windows 11 features available
- ✅ Use backslashes in file paths (or path.join)
- ✅ Target Windows 11 exclusively
- ✅ Optimize for Windows performance
- ✅ Use Windows-native tools

## Exceptions

**ONLY when explicitly requested:**

- Cross-platform Node.js packages (npm packages)
- Web applications (browser-based, platform-agnostic)
- API servers (Node/Python, platform-agnostic by nature)

**Desktop applications remain Windows 11 only.**

## Documentation Format

Use Windows syntax for commands:

```powershell
# ✅ CORRECT (Windows PowerShell)
Get-Process | Where-Object { $_.Name -like "node*" }
Test-Path C:\\dev\\apps\\nova-agent

# ❌ WRONG (Unix/Linux bash)
ps aux | grep node
test -d /dev/apps/nova-agent
```

## Validation

```powershell
# Check Windows version
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion

# Verify PowerShell version
$PSVersionTable.PSVersion

# Check platform in Node.js
node -e "console.log(process.platform)"  # Should output: win32
```

## Reference

- .claude/rules/platform-requirements.md (detailed guidelines)
- C:\\dev\\docs\\PATHS_POLICY.md (path conventions)
- Desktop app CLAUDE.md files (app-specific requirements)
