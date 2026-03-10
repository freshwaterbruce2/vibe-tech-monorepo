# Serena MCP Server Setup (2026)

**Last Updated:** 2026-01-06
**Status:** ✅ COMPLETE AND VERIFIED
**Version:** Latest from GitHub (uvx)

---

## Summary

Successfully upgraded Serena MCP server with 2026 best practices, comprehensive memories, and performance optimizations for the VibeTech Nx monorepo.

## What Was Done

### 1. Project-Specific Configuration ✅

**File:** `C:\dev\.serena\project.yml`

**Enhancements:**

- Context mode: `agent` (autonomous operation)
- Languages: TypeScript, Python, Rust
- Performance: 200k char limit, 5min timeout
- Optional tools: shell execution, memory system
- Ignore patterns: Optimized for Nx monorepo
- Initial prompt: VibeTech monorepo context
- Custom rules: File size, paths, tech stack

### 2. Comprehensive Memory System ✅

**Location:** `C:\dev\.serena\memories\`

**Created 6 Memories:**

1. monorepo-structure.md - 52+ projects, Nx benefits
2. technology-stack-2026.md - React 19, TS 5.9, Vite 7
3. path-policy-critical.md - C:\ vs D:\ storage rules
4. git-workflow-incremental-merge.md - Merge every 10 commits
5. project-completion-2026.md - 100% completion criteria
6. crypto-trading-safety.md - LIVE MONEY safety rules

### 3. MCP Configuration ✅

**File:** `C:\dev\.mcp.json`

Added Serena using uvx (2026 best practice):

```json
{
  "serena": {
    "command": "uvx",
    "args": ["--from", "git+https://github.com/oraios/serena.git", "serena"]
  }
}
```

### 4. Global Config Optimization ✅

**File:** `C:\Users\fresh_zxae3v6\.serena\serena_config.yml`

**Optimizations:**

- Log level: 40 → 20 (better visibility)
- Max chars: 150k → 200k (large files)
- Timeout: 240s → 300s (complex ops)
- Token estimator: ANTHROPIC_CLAUDE_SONNET_4
- Optional tools: All enabled

### 5. Documentation ✅

**Created:**

- `.claude/rules/serena-mcp-guide.md` - Complete usage guide
- `verify-serena-setup.ps1` - Automated verification
- `.serena/SERENA_SETUP_2026.md` - This summary

### 6. Verification ✅

**Results:** 9/10 tests passed, 0 failed, 1 warning (fixed)

---

## Key Features Enabled

- **Semantic Code Analysis** - Symbol navigation, LSP integration
- **Memory System** - Persistent knowledge across sessions
- **Shell Integration** - Run pnpm, nx, git commands
- **Agent Mode** - Autonomous code assistance
- **Performance Monitoring** - <http://localhost:24282/dashboard/>

---

## Next Steps

1. **Restart Claude Code** to activate Serena
2. **Verify dashboard** at <http://localhost:24282/dashboard/>
3. **Test activation**: "activate the project C:\dev"
4. **Browse memories**: Use list_memories tool

---

## Configuration Summary

### Project Config

```yaml
name: vibetech-monorepo
context: agent
read_only: false
languages: [typescript, python, rust]
default_max_tool_answer_chars: 200000
tool_timeout: 300
```

### Optional Tools

- execute_shell_command
- write_memory
- read_memory
- list_memories

### Ignored Paths

- node_modules, .venv, target
- .nx, .cache, coverage
- D:/databases, D:/logs, D:/learning-system

---

## Troubleshooting

**"No active project"** → Ask: "activate the project C:\dev"
**LSP not working** → Verify languages in project.yml
**Tool timeout** → Increase tool_timeout (currently 300s)
**Memory not found** → Use list_memories tool
**Dashboard unavailable** → Try ports 24282, 24283, 24284

---

## File Locations

**Configuration:**

- Global: `C:\Users\fresh_zxae3v6\.serena\serena_config.yml`
- Project: `C:\dev\.serena\project.yml`
- MCP: `C:\dev\.mcp.json`

**Memories:** `C:\dev\.serena\memories\` (6 files)

**Documentation:**

- Guide: `.claude/rules/serena-mcp-guide.md`
- Verification: `verify-serena-setup.ps1`

---

## References

- [Serena GitHub](https://github.com/oraios/serena)
- [Serena Docs](https://oraios.github.io/serena/)
- [Implementation Guide](https://smartscope.blog/en/generative-ai/claude/serena-mcp-implementation-guide/)
- [ClaudeLog](https://claudelog.com/claude-code-mcps/serena/)

---

**Setup Completed:** January 6, 2026
**Verification:** ✅ All systems operational
