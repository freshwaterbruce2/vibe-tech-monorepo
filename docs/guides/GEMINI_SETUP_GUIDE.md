# Gemini Code Assist Setup Guide

Last Updated: 2026-02-03
For: VS Code & Antigravity IDE
Platform: Windows 11


---

## Overview

This guide covers setting up Gemini Code Assist in VS Code while avoiding "shadow account" conflicts with Antigravity IDE.

## Prerequisites

- [ ] VS Code installed
- [ ] Google account (personal or workspace)
- [ ] Node.js 22.x installed
- [ ] PowerShell 7+ (already have this)

---

## Step 1: Install Gemini Code Assist Extension

### In VS Code

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for: **"Gemini Code Assist"**
4. Click **Install** (by Google Cloud)
5. Reload VS Code if prompted

**Verification:**

- You should see a Gemini icon in the activity bar (left sidebar)
- Open Command Palette (`Ctrl+Shift+P`) and type "Gemini" - you should see Gemini commands

---

## Step 2: Authenticate Gemini

### Initial Sign-In

1. Click the Gemini icon in the activity bar
2. Click **Sign in to Google**
3. Choose your account:
   - ✅ **Individual Mode** (recommended for personal projects)
   - ❌ **Workspace Mode** (can cause shadow account issues)

**IMPORTANT:** If you use Antigravity IDE with Gemini, use the SAME account type (Individual) to avoid conflicts.

### Verify Authentication

```powershell
# Check if CLI is authenticated
gemini auth status
```

Expected output:
```
✓ Authenticated as: your-email@gmail.com
Mode: Individual
```

---

## Step 3: Install Gemini CLI Bridge

The CLI needs a helper extension to communicate with VS Code.

### Installation

1. Open **Integrated Terminal** in VS Code (`Ctrl+~`)
2. Run:

```powershell
gemini /ide install
```

3. This will:
   - Install a small VS Code extension
   - Enable native diffing (shows changes before applying)
   - Configure the IDE integration

**Verification:**

```powershell
# Check if bridge is installed
gemini /ide status
```

Expected output:
```
✓ IDE integration: Active
✓ Editor: VS Code
✓ Diff viewer: Native
```

---

## Step 4: Configure Gemini for Monorepo

### Create Gemini Config

Create `.gemini/config.json` in your project root:

```json
{
  "project": {
    "name": "VibeTech Monorepo",
    "type": "nx-monorepo",
    "packageManager": "pnpm"
  },
  "codeAssist": {
    "contextFiles": [
      "CLAUDE.md",
      "AI.md",
      "docs/ai/WORKSPACE.md",
      "nx.json",
      "pnpm-workspace.yaml"
    ],
    "excludePaths": [
      "**/node_modules/**",
      "**/.nx/**",
      "**/dist/**",
      "D:/databases/**",
      "D:/logs/**"
    ]
  },
  "features": {
    "inlineCompletions": true,
    "chatAssist": true,
    "nativeDiff": true,
    "workspaceIndexing": true
  }
}
```

### Verify Configuration

```powershell
# Check if Gemini sees your config
gemini config show
```

---

## Step 5: Avoiding Shadow Account Issues

### The Problem

Using Gemini in **both VS Code and Antigravity IDE** with the same Google account can create a "shadow project" in Google Cloud that lacks proper permissions.

### The Solution

**Option A: Use Same Mode in Both IDEs (Recommended)**

1. Choose **Individual Mode** in VS Code
2. Choose **Individual Mode** in Antigravity IDE
3. Use the SAME Google account for both

**Option B: Use Different Accounts**

1. VS Code: Personal Google account (Individual)
2. Antigravity: Work Google account (Workspace)
3. Keep them completely separate

**Option C: Disable Gemini in One IDE**

If you primarily use Antigravity:
1. Disable Gemini extension in VS Code
2. Use Gemini only in Antigravity IDE

### Check for Shadow Accounts

1. Visit: [Google Cloud Console](https://console.cloud.google.com)
2. Check your projects list
3. Look for unexpected projects like:
   - `gemini-vscode-xxxxx`
   - `code-assist-shadow-xxxxx`
4. If found, verify they have:
   - ✅ Billing enabled
   - ✅ Gemini API enabled

---

## Step 6: Test the Integration

### Test Inline Completions

1. Open a TypeScript file: `apps/nova-agent/src/App.tsx`
2. Start typing a function:

```typescript
function calculateTotal
```

3. Wait 1-2 seconds
4. You should see Gemini suggestions appear in gray text
5. Press `Tab` to accept

### Test Chat Assist

1. Open Gemini chat (click icon in sidebar)
2. Ask: "What is the structure of this monorepo?"
3. Gemini should analyze your workspace and respond with project structure

### Test Native Diff

1. In terminal, run:

```powershell
gemini "refactor this function to use async/await" src/utils/api.ts
```

2. You should see:
   - Original code on left
   - Proposed changes on right
   - Accept/Reject buttons

---

## Step 7: Integration with pnpm Workflow

### Add Gemini Commands to package.json

```json
{
  "scripts": {
    "gemini:check": "gemini check",
    "gemini:analyze": "gemini analyze --workspace",
    "gemini:test": "gemini test --all"
  }
}
```

### Use Gemini with Nx

```powershell
# Analyze affected projects
pnpm nx affected:apps | gemini analyze

# Get suggestions for failing tests
pnpm nx test nova-agent --watch | gemini debug
```

---

## Troubleshooting

### Issue 1: "Authentication Failed"

**Symptoms:** Can't sign in, authentication loops

**Solution:**

1. Sign out completely:
   ```powershell
   gemini auth logout
   ```

2. Clear VS Code auth cache:
   ```powershell
   Remove-Item -Recurse -Force "$env:APPDATA\Code\User\globalStorage\google.*"
   ```

3. Restart VS Code

4. Sign in again using **Individual Mode**

### Issue 2: "Shadow Account Detected"

**Symptoms:** Gemini works in one IDE but not the other

**Solution:**

1. Check Google Cloud Console for shadow projects
2. Ensure both IDEs use the same authentication mode
3. Delete shadow projects that lack API access
4. Re-authenticate in both IDEs

### Issue 3: "CLI Bridge Not Working"

**Symptoms:** `gemini /ide` commands don't work

**Solution:**

1. Reinstall bridge:
   ```powershell
   gemini /ide uninstall
   gemini /ide install
   ```

2. Verify VS Code is in PATH:
   ```powershell
   where.exe code
   ```

3. Restart VS Code

### Issue 4: "Slow Completions"

**Symptoms:** Completions take >5 seconds to appear

**Solution:**

1. Reduce indexed files in `.gemini/config.json`:
   ```json
   {
     "codeAssist": {
       "indexingStrategy": "selective",
       "maxFilesIndexed": 1000
     }
   }
   ```

2. Clear Gemini cache:
   ```powershell
   gemini cache clear
   ```

---

## Best Practices

### 1. Use Individual Mode for Solo Development

- ✅ Simpler authentication
- ✅ No shadow account issues
- ✅ Works across multiple IDEs
- ❌ Workspace Mode (unless you're on a team)

### 2. Configure Exclusions

Always exclude large/generated directories:

```json
{
  "excludePaths": [
    "**/node_modules/**",
    "**/.nx/**",
    "**/dist/**",
    "**/coverage/**",
    "D:/databases/**"
  ]
}
```

### 3. Use Native Diff

Enable native diffing for safer code changes:

```powershell
gemini config set diff.mode native
```

### 4. Monitor Usage

Check your Gemini API usage:

```powershell
# View usage stats
gemini usage show

# Set monthly limits
gemini usage limit 1000
```

---

## Integration with Existing Tools

### With Claude Code

- **Claude:** Strategic architecture, complex refactoring
- **Gemini:** Quick completions, inline suggestions
- **Both:** Use together for best results

### With Nx

```powershell
# Use Gemini to generate Nx commands
gemini "create a new React app called my-app" --executor nx

# Analyze project graph
pnpm nx graph --file graph.json
gemini analyze graph.json
```

### With pnpm

```powershell
# Get package suggestions
gemini "suggest dependencies for authentication" --package-manager pnpm

# Debug installation issues
pnpm install 2>&1 | gemini debug
```

---

## Verification Checklist

After setup, verify all features work:

- [ ] Gemini icon appears in VS Code sidebar
- [ ] Inline completions work (gray suggestions)
- [ ] Chat assist responds to workspace questions
- [ ] Native diff shows in terminal
- [ ] No authentication loops
- [ ] Same account works in VS Code and Antigravity
- [ ] No shadow account warnings in Google Cloud Console
- [ ] Config file recognized: `gemini config show`
- [ ] CLI bridge working: `gemini /ide status`

---

## Related Documentation

- **pnpm Setup:** `.claude/rules/pnpm-2026-best-practices.md`
- **Workspace Guidelines:** `CLAUDE.md`
- **Nx Integration:** `docs/ai/WORKSPACE.md`
- **MCP Servers:** `.claude/rules/mcp-servers.md`

---

## External Resources

- [Gemini Code Assist Docs](https://cloud.google.com/gemini/docs/code-assist)
- [VS Code Integration Guide](https://code.visualstudio.com/docs/ai/gemini)
- [Troubleshooting Shadow Accounts](https://cloud.google.com/gemini/docs/troubleshooting#shadow-accounts)

---

**Next Steps:**

1. Run cleanup script: `.\scripts\cleanup-and-reinstall.ps1`
2. Install Gemini extension in VS Code
3. Authenticate with Individual Mode
4. Install CLI bridge: `gemini /ide install`
5. Test inline completions
6. Verify no shadow account issues

---

_Last Updated:_ February 3, 2026
_Status:_ Active
_Tested On:_ Windows 11, VS Code 1.95+, Gemini CLI 2.0+
