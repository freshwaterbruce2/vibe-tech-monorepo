# Gemini CLI Quick Fix - Stop Reinstalling Every Time

**Last Updated:** 2026-02-03
**Issue:** Gemini CLI reinstalls on every command
**Solution:** Install globally instead of using npx

---

## The Problem

When you type `gemini`, one of these is happening:

1. **npx alias** - Your PowerShell profile has an alias that runs `npx @google/gemini-cli` which downloads it fresh every time
2. **No global install** - Gemini CLI isn't installed globally, so PowerShell falls back to npx
3. **PATH issue** - Global install exists but isn't in PATH

---

## Quick Fix (Automated)

Run this script to fix everything automatically:

```powershell
C:\dev\fix-gemini-cli-install.ps1
```

**What it does:**
1. Checks if Gemini CLI is installed globally
2. Installs it globally if missing
3. Removes any conflicting npx aliases from PowerShell profile
4. Verifies the installation works

**After running:** Restart your terminal completely (close all PowerShell windows)

---

## Manual Fix (If Automated Fails)

### Step 1: Install Globally

```powershell
# Install Gemini CLI globally (one-time)
npm install -g @google/gemini-cli@latest

# Verify installation
npm list -g @google/gemini-cli
```

**Expected output:**
```
C:\Users\your-username\AppData\Roaming\npm
└── @google/gemini-cli@0.23.0
```

### Step 2: Check PowerShell Profile

```powershell
# Open your PowerShell profile
notepad $PROFILE
```

**Remove any of these lines if they exist:**
```powershell
# ❌ REMOVE THESE (they cause reinstalls)
function gemini { npx @google/gemini-cli @args }
function gemini { npx -y @google/gemini-cli @args }
Set-Alias -Name gemini -Value "npx @google/gemini-cli"
```

**Save and close the file.**

### Step 3: Refresh PATH

```powershell
# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Step 4: Verify

```powershell
# Check which gemini is being used
Get-Command gemini

# Should show:
# C:\Users\your-username\AppData\Roaming\npm\gemini.cmd
```

---

## How to Test

After fixing:

```powershell
# Test version (should be instant)
gemini --version

# Test basic command (should not reinstall)
gemini chat "hello"
```

**Good sign:** Commands run immediately without any "npm install" messages

**Bad sign:** You see "Downloading @google/gemini-cli" or npm install messages

---

## Why This Happens

### npx Behavior

When you run `npx @google/gemini-cli`:
1. npx checks if package is installed globally
2. If not found, downloads and installs it temporarily
3. Runs the command
4. **Deletes the temporary installation**
5. Next command repeats the whole process

### Global Installation

When installed globally with `npm install -g`:
1. Package installed once to global npm directory
2. Added to system PATH
3. Commands run instantly from cache
4. No reinstallation needed

---

## Troubleshooting

### Issue: "gemini not recognized"

```powershell
# Check if npm global bin is in PATH
npm config get prefix
# Example output: C:\Users\your-username\AppData\Roaming\npm

# Verify this directory is in PATH
$env:Path -split ';' | Select-String "npm"
```

**If not in PATH:**
1. Open System Properties → Environment Variables
2. Edit user PATH variable
3. Add: `C:\Users\your-username\AppData\Roaming\npm`
4. Click OK and restart terminal

### Issue: Still reinstalling after global install

```powershell
# Check for alias override
Get-Alias gemini -ErrorAction SilentlyContinue
Get-Command gemini -All

# If multiple results, check PowerShell profile
notepad $PROFILE
```

### Issue: Permission denied during global install

```powershell
# Run PowerShell as Administrator
# Then install globally
npm install -g @google/gemini-cli@latest
```

### Issue: Old version cached

```powershell
# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g @google/gemini-cli
npm install -g @google/gemini-cli@latest
```

---

## Best Practices (2026)

### DO ✅

- Install CLI tools globally with `npm install -g`
- Use direct commands (`gemini`) instead of npx for installed tools
- Keep PowerShell profile clean and documented
- Update regularly: `npm update -g @google/gemini-cli`

### DON'T ❌

- Use `npx` for frequently used CLI tools
- Create aliases that override global installations
- Run `npx @google/gemini-cli` repeatedly (wastes bandwidth/time)
- Forget to restart terminal after PATH changes

---

## Quick Reference Commands

```powershell
# Check installation status
Get-Command gemini
npm list -g @google/gemini-cli

# Install/Update globally
npm install -g @google/gemini-cli@latest
npm update -g @google/gemini-cli

# Test performance
Measure-Command { gemini --version }
# Should be < 1 second if properly installed

# View PowerShell profile
code $PROFILE  # VS Code
notepad $PROFILE  # Notepad

# Refresh PATH (current session)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

---

## Related Documentation

- `.gemini/settings.json` - Gemini CLI configuration
- `docs/guides/GEMINI_CLI_2026_UPDATED.md` - Full setup guide
- `docs/guides/GEMINI_CLI_FIX_2026.md` - Troubleshooting guide

---

**After Fix:**
- ✅ Instant commands (no install delay)
- ✅ Consistent version across sessions
- ✅ Offline capability (no download needed)
- ✅ Better performance

**Expected Speed:**
- Before: 10-30 seconds per command (reinstall)
- After: < 1 second per command (global cache)

---

**Last Verified:** 2026-02-03
**Gemini CLI Version:** 0.23.0
**Fix Script:** `C:\dev\fix-gemini-cli-install.ps1`
