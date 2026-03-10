# Gemini VSCode Setup Guide

Complete configuration for Gemini CLI and Gemini Code Assist in VSCode.

## ✅ Installation Complete

### Extensions Installed
- ✅ `google.gemini-cli-vscode-ide-companion` - Official Gemini CLI companion
- ✅ `google.geminicodeassist` - Gemini Code Assist with Agent Mode
- ✅ `printfn.gemini-improved` - Enhanced Gemini features

### CLI Tools
- ✅ Gemini CLI v0.26.0 (globally installed via npm)
- ✅ Node.js v22.21.1 (via Volta)

## 🚀 Keyboard Shortcuts

### Gemini Code Assist
| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Shift+G` | Open Chat | Focus Gemini Code Assist chat panel |
| `Ctrl+Shift+A` | Start Agent | Start Gemini agent mode for current file |
| `Ctrl+Alt+G` | Trigger Suggestions | Manually trigger inline suggestions |
| `Ctrl+Shift+E` | Explain Code | Explain selected code |
| `Ctrl+Shift+R` | Refactor Code | Refactor selected code |
| `Ctrl+Shift+T` | Generate Tests | Generate tests for current file |
| `Ctrl+Shift+D` | Generate Docs | Generate documentation |

### Gemini CLI
| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Alt+Shift+G` | Open CLI Chat | Open Gemini CLI chat in terminal |
| `Ctrl+Alt+Shift+T` | Send to Terminal | Send selected code to Gemini CLI |

## ⚙️ Configuration

### Agent Mode (YOLO Mode Enabled!)
Your configuration has **YOLO mode** enabled:
```json
{
  "geminicodeassist.agentYoloMode": true,
  "geminicodeassist.agent.autoExecuteSimpleTasks": true,
  "geminicodeassist.agent.requireConfirmation": false
}
```

**What this means:**
- ✅ Agent will auto-execute simple tasks WITHOUT asking
- ✅ Maximum automation and speed
- ⚠️ Less control - agent makes decisions automatically
- 💡 Great for experienced users who trust the AI

### MCP Servers
MCP (Model Context Protocol) servers are enabled, allowing Gemini to:
- Access local file systems
- Query databases
- Execute commands
- Use external tools

### Context Exclusions
Files matching patterns in `.geminiignore` are excluded from AI context to:
- Reduce token usage
- Improve performance
- Protect sensitive data

## 🎯 Usage Tips

### 1. Inline Suggestions
- Type naturally - Gemini will suggest completions automatically
- Press `Tab` to accept suggestions
- Press `Esc` to dismiss
- Press `Ctrl+Alt+G` to manually trigger

### 2. Agent Mode Workflow
1. Press `Ctrl+Shift+A` in any file
2. Describe your task in natural language
3. Agent will analyze and execute automatically (YOLO mode)
4. Review changes in the diff view

### 3. Code Explanations
1. Select code you want to understand
2. Press `Ctrl+Shift+E`
3. Gemini explains the code in the chat panel

### 4. Refactoring
1. Select code to refactor
2. Press `Ctrl+Shift+R`
3. Describe desired changes
4. Agent refactors with YOLO auto-apply

### 5. Test Generation
1. Open the file you want to test
2. Press `Ctrl+Shift+T`
3. Gemini generates comprehensive tests
4. Tests appear in a new file or inline

### 6. CLI Integration
Use `gemini` command in the integrated terminal:
```bash
# Start interactive chat
gemini

# One-shot commands
gemini "explain this error: [paste error]"

# Generate code
gemini "create a react component for a login form"

# Code review
gemini code-review --file src/app.ts
```

## 🔧 Troubleshooting

### WASM Memory Error (FIXED)
If you see `RuntimeError: memory access out of bounds`:
```bash
npm uninstall -g @google/gemini-cli
npm cache clean --force
npm install -g @google/gemini-cli@latest
```

### Agent Not Starting
1. Check status bar for Gemini CLI status
2. Verify project is configured: Check `geminicodeassist.project` in settings
3. Restart VSCode
4. Check output panel: View → Output → Gemini Code Assist

### Slow Performance
1. Check `.geminiignore` excludes large directories
2. Reduce `typescript.tsserver.maxTsServerMemory` if needed
3. Disable other AI extensions temporarily
4. Close unused workspace folders

### API Key Issues
Gemini Code Assist uses Google Cloud authentication:
1. Ensure you're logged into Google Cloud in VSCode
2. Check Command Palette → "Google Cloud: Sign In"
3. Verify project access permissions

## 📊 Current Configuration Summary

```json
{
  "Project ID": "glowing-tube-cjgzv",
  "Agent Mode": "ENABLED (YOLO)",
  "MCP Servers": "ENABLED",
  "Update Channel": "Insiders",
  "Auto-Execute": "YES",
  "Confirmation Required": "NO",
  "Inline Suggestions": "AUTO",
  "CLI Auto-Start": "YES"
}
```

## 🎓 Best Practices

1. **Use .geminiignore**
   - Exclude `node_modules`, `dist`, `build`
   - Exclude sensitive files (`.env`, credentials)
   - Exclude large binary files

2. **Agent Mode Tips**
   - Be specific in your requests
   - Review changes before committing
   - Use version control - commit before big refactors
   - YOLO mode is fast but review is still important

3. **Performance Optimization**
   - Keep workspace size manageable
   - Use workspace folders strategically
   - Exclude large directories from file watcher
   - Close files you're not actively editing

4. **Security**
   - Never expose API keys in prompts
   - Use `.geminiignore` for sensitive files
   - Review generated code for security issues
   - Be cautious with YOLO mode on sensitive codebases

## 🔗 Resources

- [Gemini CLI Documentation](https://cloud.google.com/gemini/docs/cli)
- [Gemini Code Assist Documentation](https://cloud.google.com/gemini/docs/code-assist)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [VSCode Extension Marketplace](https://marketplace.visualstudio.com)

## 🆘 Getting Help

1. Check Output Panel: `View → Output → Gemini Code Assist`
2. Check Developer Tools: `Help → Toggle Developer Tools → Console`
3. Report issues: [Gemini CLI GitHub](https://github.com/google/gemini-cli/issues)
4. Community: [Google Cloud Community](https://cloud.google.com/community)

---

**Setup Date:** 2026-01-28
**Gemini CLI Version:** 0.26.0
**VSCode Version:** Latest
**Configuration:** Aggressive YOLO Mode ⚡
