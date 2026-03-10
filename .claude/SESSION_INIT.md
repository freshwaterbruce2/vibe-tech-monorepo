# Session Initialization Protocol v1.0

## MANDATORY: Execute This At Every Session Start

When Claude starts a new session with Bruce, IMMEDIATELY perform these steps BEFORE responding to the user's first request:

---

## Step 1: Load Context (30 seconds)

```powershell
# Read current dev status
Get-Content C:\dev\DEV_CONTEXT.md -ErrorAction SilentlyContinue
```

**Tool Calls Required:**
1. `desktop-commander:dc_read_file` → `C:\dev\DEV_CONTEXT.md`
2. `serena:activate_project` → Activate relevant project based on user query

---

## Step 2: Identify Task Category

Map the user's request to ONE of these categories:

| Category | Trigger Keywords | Tools to Load |
|----------|------------------|---------------|
| **Code/Build** | build, fix, test, error, nx | serena, nx-mcp, Context7 |
| **File Ops** | file, create, move, backup | desktop-commander |
| **Browser** | browse, scrape, test site | playwright, Claude in Chrome |
| **Desktop** | window, click, automate | Windows-MCP, desktop-commander |
| **Docs** | document, pdf, word, excel | PDF Tools, docx/xlsx skills |
| **AI/Agents** | agent, delegate, multi-agent | vibetech-agents skill |
| **Database** | sql, query, db, migrate | serena (for code), d1_database_query |
| **Frontend** | ui, react, component, style | frontend-design skill |
| **Maintenance** | update, deps, cleanup | monorepo-maintenance skill |

---

## Step 3: Load Relevant Skills

**ALWAYS call `skills:get_skill` for the matched category!**

### Code/Build Tasks:
```
skills:get_skill("typescript-expert")
skills:get_skill("react-patterns")  
skills:get_skill("testing-patterns")
```

### Desktop Automation:
```
skills:get_skill("powershell-windows")
skills:get_skill("browser-automation")
```

### Document Creation:
```
skills:get_skill("docx") OR skills:get_skill("pdf") OR skills:get_skill("pptx")
```

### Agent Tasks:
```
skills:get_skill("vibetech-agents")  # CUSTOM - Bruce's 19-agent system
skills:get_skill("dispatching-parallel-agents")
```

---

## Step 4: Check for Specialist Agents

Read the agent manifest:
```
desktop-commander:dc_read_file → C:\dev\.claude\agents.json
```

If task matches a specialist, consider delegation:
- `backend-expert.md` → API, database, auth
- `frontend-expert.md` → UI, React, components
- `desktop-expert.md` → Electron, Tauri builds
- `qa-expert.md` → Testing, coverage
- `crypto-expert.md` → Trading bot tasks

---

## Step 5: Tool Readiness Check

Before starting work, confirm these tools respond:

| Tool | Check Command | If Fails |
|------|---------------|----------|
| desktop-commander | `dc_get_system_info` | Core tool, must work |
| serena | `list_memories` | Activate project first |
| nx-mcp | `nx_available_plugins` | For monorepo tasks |

---

## Example Session Initialization

**User says:** "Fix the TypeScript error in nova-agent"

**Agent should:**
1. ✅ Read `C:\dev\DEV_CONTEXT.md`
2. ✅ Identify: Code/Build task
3. ✅ Load skills: `typescript-expert`, `testing-patterns`
4. ✅ Activate project: `serena:activate_project("nova-agent")`
5. ✅ Check agent: `qa-expert.md` might help
6. ✅ NOW respond and fix the error

---

## Anti-Pattern: What NOT To Do

❌ Respond immediately without loading context  
❌ Skip skill loading because "I know TypeScript"  
❌ Ignore the agent system entirely  
❌ Only use tools when explicitly asked  
❌ Forget about the learning system at `D:\learning-system`  

---

## Session Metrics (Optional)

Track tool usage per session:
- Skills loaded: ___
- MCP tools used: ___
- Agents consulted: ___
- Files created/modified: ___

Report at session end to `D:\learning-system\sessions\`
