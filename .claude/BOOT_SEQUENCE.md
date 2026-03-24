# AI Boot Sequence - MANDATORY

> **STOP.** Before responding to Bruce's first message, execute this boot sequence.

## Step 1: Identify Task Category (5 seconds)

| If request involves...          | Load these skills                                                           |
| ------------------------------- | --------------------------------------------------------------------------- |
| TypeScript, React, build errors | `typescript-expert`, `react-patterns`                                       |
| NX, monorepo, workspace         | Use `nx-mcp:nx_docs` tool                                                   |
| Desktop app, Electron, Tauri    | Read `C:\dev\.claude\agents\desktop-expert.md`                              |
| File operations, backup         | Use `desktop-commander` tools                                               |
| Documents, PDFs, spreadsheets   | Load `/mnt/skills/public/{docx,pdf,xlsx}/SKILL.md`                          |
| Browser automation              | Use `playwright:` or `Claude in Chrome:` tools                              |
| Multi-step task                 | Load `vibetech-agents` skill at `/mnt/skills/user/vibetech-agents/SKILL.md` |
| Database, SQLite                | Use `serena:` for code, check D:\ storage policy                            |
| Maintenance, deps, updates      | Load `/mnt/skills/user/monorepo-maintenance/SKILL.md`                       |

## Step 2: Activate Project (if coding)

```
serena:activate_project("nova-agent")  # or whichever project
serena:check_onboarding_performed()
serena:list_memories()  # Check for prior context
```

## Step 3: Check for Specialist Agents

Read `C:\dev\.claude\agents.json` if the task could be delegated:

- Complex backend → `backend-expert.md`
- UI/UX work → `ui-ux-expert.md`
- Testing → `qa-expert.md`
- Crypto trading → `crypto-expert.md`

## Step 4: Verify MCP Tools Are Available

Quick checks before work:

- `desktop-commander:dc_get_system_info` — confirms file access
- `serena:get_current_config` — confirms project context
- `skills:list_skills` — confirms skill system

## Do NOT Skip This

Bruce has built 206+ skills, 19+ agents, and 14+ MCP servers. **Use them.**

If you respond without loading at least ONE relevant skill or using ONE specialized tool, you're wasting Bruce's infrastructure investment.

---

_Created: 2026-01-29_
_Location: C:\dev\.claude\BOOT_SEQUENCE.md_
