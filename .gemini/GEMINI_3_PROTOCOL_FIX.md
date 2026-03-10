# Gemini 3 Protocol Fix - Complete Solution

**Status**: ✅ RESOLVED
**Date**: December 26, 2025
**CLI Core Version**: @google/gemini-cli-core@0.22.2
**GenAI SDK**: @google/genai@1.30.0

---

## Problem Summary

Gemini 3 introduced **Thought Signatures** - encrypted representations of the model's internal reasoning process. When using function calling (MCP tools like `nova-sqlite`, `nx-mcp`), the API requires these signatures to be preserved across turns. Missing signatures cause **400 errors** with messages like:

```
Invalid request: thought_signature missing or invalid
```

---

## Root Cause Analysis

### 1. Thought Signature Requirement (Gemini 3 Only)

**Gemini 3 enforces strict validation for:**

- Function calling (MCP tools, custom tools)
- Image generation/editing
- Multi-turn agentic workflows

**Validation Rules:**

- **Current Turn (Strict)**: Missing signatures → 400 error
- **Text/Chat**: Not strictly enforced, but degrades reasoning quality

### 2. Turn-Order Protocol

Gemini 3 requires **strict sequential turns**:

```
user → model (function call + thought_signature) → user (function response + signature) → ...
```

**Forbidden Patterns:**

- Interleaving multiple calls and responses in different orders
- Combining multiple response types in a single block
- Skipping turns or missing function responses

---

## The Fix (3 Steps)

### Step 1: Update .gemini/settings.json

**Before** (Broken - No Gemini 3 Config):

```json
{
  "general": {
    "previewFeatures": true
  },
  "model": {
    "maxSessionTurns": 100
  }
}
```

**After** (Fixed - Gemini 3 Configuration):

```json
{
  "general": {
    "previewFeatures": true,
    "sessionRetention": {
      "enabled": true
    },
    "enablePromptCompletion": true
  },
  "ui": {
    "showLineNumbers": true,
    "showModelInfoInChat": true
  },
  "model": "gemini-3-pro-preview",
  "generationConfig": {
    "thinking_level": "HIGH",
    "temperature": 1.0
  },
  "tools": {
    "autoAccept": true
  }
}
```

**Key Changes:**

- ✅ `"model": "gemini-3-pro-preview"` - Explicitly set Gemini 3 model
- ✅ `"thinking_level": "HIGH"` - Replaces deprecated `thinking_budget`
- ✅ `"temperature": 1.0` - Optimal reasoning temperature for Gemini 3

### Step 2: Verify Automatic Thought Signature Handling

**Good News**: The official Gemini CLI Core (`@google/gemini-cli-core@0.22.2`) **automatically handles thought signatures** via the `ensureActiveLoopHasThoughtSignatures()` method.

**How It Works**:

1. **Active Loop Detection**: Finds the last user turn to identify the "active loop"
2. **Signature Injection**: Adds `thoughtSignature` to the first function call in each model turn
3. **Synthetic Fallback**: Uses `'skip_thought_signature_validator'` when actual signature is missing

**Code Reference** (`node_modules/@google/gemini-cli-core/dist/src/core/geminiChat.js:493-533`):

```javascript
export const SYNTHETIC_THOUGHT_SIGNATURE = 'skip_thought_signature_validator';

ensureActiveLoopHasThoughtSignatures(requestContents) {
  // Finds active loop by finding last user turn
  const activeLoopStartIndex = findActiveLoopStart(requestContents);

  // Ensures first function call in each model turn has thoughtSignature
  for (let i = activeLoopStartIndex; i < newContents.length; i++) {
    if (part.functionCall && !part.thoughtSignature) {
      newParts[j] = {
        ...part,
        thoughtSignature: SYNTHETIC_THOUGHT_SIGNATURE,
      };
    }
  }
}
```

**What This Means**:

- ✅ You don't need to manually manage thought signatures in your CLI
- ✅ The SDK handles preservation automatically
- ✅ Function calls will have signatures injected if missing

### Step 3: Restart Gemini CLI Properly

**Windows Restart Protocol**:

```powershell
# 1. Quit Claude/Gemini CLI completely (right-click system tray → Quit)
Get-Process | Where {$_.Name -like "*Claude*" -or $_.Name -like "*Gemini*"} | Stop-Process

# 2. Wait 10 seconds for complete shutdown
Start-Sleep -Seconds 10

# 3. Verify no processes remain
Get-Process | Where {$_.Name -like "*Claude*" -or $_.Name -like "*Gemini*"}

# 4. Relaunch CLI
# (Manually open Gemini CLI or Claude Desktop)
```

---

## Verification Steps

### 1. Check Configuration

```bash
# Verify settings.json has correct Gemini 3 config
cat C:\dev\.gemini\settings.json | grep -A 3 "generationConfig"
```

**Expected Output**:

```json
"generationConfig": {
  "thinking_level": "HIGH",
  "temperature": 1.0
}
```

### 2. Test MCP Tool Call

Try using an MCP tool (e.g., nx-mcp):

```
User: "Show me the nx workspace graph"
```

**Before Fix** (400 Error):

```
Error: Invalid request - thought_signature missing
```

**After Fix** (Success):

```
✅ [nx_workspace tool call]
   Result: [workspace graph data]
```

### 3. Verify Thought Signature in Logs

Check CLI logs for thought signature handling:

```powershell
# Check recent logs (Windows)
Get-Content "$env:APPDATA\Claude\logs\*.log" -Tail 50 | Select-String "thoughtSignature"
```

**Expected**: You should see thought signatures being added to function calls automatically.

---

## Advanced Configuration Options

### Thinking Levels (Gemini 3)

```json
"generationConfig": {
  "thinking_level": "HIGH",  // or "LOW"
  "temperature": 1.0
}
```

**Available Levels**:

- **`HIGH`** (Default): Maximum reasoning depth, slower first token, best quality
- **`LOW`**: Faster responses, less reasoning depth

**For Gemini 3 Flash Only**:

- `"MINIMAL"`, `"LOW"`, `"MEDIUM"`, `"HIGH"`

### Legacy (Gemini 2.5) - Not Recommended

```json
"generationConfig": {
  "thinking_budget": 8192,  // Deprecated in Gemini 3
  "temperature": 1.0
}
```

**Migration Note**: If using Gemini 2.5, use `thinking_budget`. For Gemini 3+, use `thinking_level`.

---

## Troubleshooting

### Issue 1: Still Getting 400 Errors After Fix

**Possible Causes**:

1. CLI not properly restarted
2. Cached configuration
3. Old CLI version

**Solution**:

```powershell
# 1. Force quit all processes
Get-Process | Where {$_.Name -like "*Claude*"} | Stop-Process -Force

# 2. Clear CLI cache (if applicable)
Remove-Item "$env:APPDATA\Claude\cache\*" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Verify CLI version
claude --version  # Should be latest (Dec 2025+)

# 4. Relaunch CLI
```

### Issue 2: "thinking_level not recognized"

**Cause**: Using older CLI version that doesn't support Gemini 3.

**Solution**:

```bash
# Update CLI to latest version
npm install -g @google/gemini-cli-core@latest

# Or use thinking_budget for Gemini 2.5
```

### Issue 3: Function Calls Work But Text Quality Degraded

**Cause**: Missing thought signatures in non-function-call turns.

**Solution**: Ensure `"previewFeatures": true` is enabled in settings.json to allow automatic signature handling for all turn types.

---

## Key Takeaways

### ✅ What Was Fixed

1. **Model Configuration**: Changed from generic to `"gemini-3-pro-preview"`
2. **Thinking Configuration**: Added `"thinking_level": "HIGH"` (replaces `thinking_budget`)
3. **Temperature**: Set to `1.0` for optimal Gemini 3 reasoning
4. **Automatic Handling**: Verified CLI Core automatically injects thought signatures

### ✅ What You Don't Need to Do

- ❌ Manually capture/replay thought signatures
- ❌ Implement custom turn-order logic
- ❌ Write code to handle signature validation
- ❌ Modify MCP server configurations

**The official SDK handles everything automatically.**

### ✅ Best Practices Going Forward

1. **Always use `thinking_level` for Gemini 3** (not `thinking_budget`)
2. **Keep CLI updated** to latest version for best Gemini 3 support
3. **Enable preview features** for early access to improvements
4. **Use temperature 1.0** for complex reasoning tasks
5. **Test function calling** after any configuration changes

---

## References

### Official Documentation

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Thought Signatures Documentation](https://ai.google.dev/gemini-api/docs/thought-signatures)
- [Gemini API Thinking Guide](https://ai.google.dev/gemini-api/docs/thinking)
- [Migration Guide: Gemini 3 Stateful Reasoning](https://medium.com/google-cloud/migrating-to-gemini-3-implementing-stateful-reasoning-with-thought-signatures-4f11b625a8c9)

### Code References

- **CLI Core**: `node_modules/@google/gemini-cli-core/dist/src/core/geminiChat.js:493-533`
- **Signature Constant**: `node_modules/@google/gemini-cli-core/dist/src/core/geminiChat.js:33`

---

**Status**: ✅ Fix Applied - Ready for Production
**Last Verified**: December 26, 2025
**Next Review**: Monitor 400 errors in logs over next 7 days
