# Drift Detection Rules

Complete rule set for detecting ecosystem drift. Each rule has an ID, severity, detection method, and auto-fix capability.

## Path Rules

| ID       | Rule                                               | Severity    | Auto-fixable             |
| -------- | -------------------------------------------------- | ----------- | ------------------------ |
| PATH-001 | Every `C:\dev\*` path in a skill file must resolve | 🔴 Breaking | No (needs manual review) |
| PATH-002 | Every `C:\Users\fresh_zxae3v6\*` path must resolve | 🔴 Breaking | No                       |
| PATH-003 | Agent config paths must point to existing files    | 🔴 Breaking | No                       |
| PATH-004 | MCP server executable paths must resolve           | 🔴 Breaking | No                       |
| PATH-005 | `D:\` database paths must resolve                  | 🟡 Stale    | No                       |

### Detection

```powershell
# Extract all Windows paths from a file
Select-String -Path $file -Pattern '[A-Z]:\\[^\s"''`]+' -AllMatches |
  ForEach-Object { $_.Matches.Value } |
  Where-Object { -not (Test-Path $_) }
```

## Dependency Version Rules

| ID      | Rule                                                       | Severity | Auto-fixable                |
| ------- | ---------------------------------------------------------- | -------- | --------------------------- |
| DEP-001 | Skill-mentioned package versions must match `package.json` | 🟡 Stale | Yes (update version string) |
| DEP-002 | MCP server SDK version should be latest stable             | 🟡 Stale | Yes (update package.json)   |
| DEP-003 | `zod` version must be consistent across all MCP servers    | 🟡 Stale | Yes                         |
| DEP-004 | React version in skills must match monorepo                | 🟡 Stale | Yes                         |
| DEP-005 | TypeScript version in skills must match monorepo           | 🟡 Stale | Yes                         |
| DEP-006 | Nx version in skills must match monorepo                   | 🟡 Stale | Yes                         |

### Detection

```powershell
# Get monorepo root versions
$rootPkg = Get-Content "C:\dev\package.json" | ConvertFrom-Json
$reactVersion = $rootPkg.dependencies.react -replace '[\^~]',''
$tsVersion = $rootPkg.devDependencies.typescript -replace '[\^~]',''

# Compare against skill mentions
# e.g., if SKILL.md says "React 19" but monorepo has "react": "^20.0.0"
```

## Agent Config Rules

| ID      | Rule                                                            | Severity    | Auto-fixable       |
| ------- | --------------------------------------------------------------- | ----------- | ------------------ |
| AGT-001 | Agent count in vibetech-agents skill must match agents.json     | 🔴 Breaking | Yes (update count) |
| AGT-002 | Every agent must have non-empty `description` field             | 🔴 Breaking | No (needs content) |
| AGT-003 | Model IDs must be valid (haiku-4, sonnet-4, opus-4.5, opus-4.6) | 🔴 Breaking | Yes                |
| AGT-004 | Sequential execution chains must reflect actual dependencies    | 🟡 Stale    | No                 |
| AGT-005 | Category assignments must match agent's actual scope            | 🟡 Stale    | No                 |
| AGT-006 | Trigger patterns must match monorepo file structure             | 🟡 Stale    | No                 |

### Detection

```powershell
# Count agents in config vs skill
$configAgents = (Get-Content "C:\dev\.claude\agents.json" | ConvertFrom-Json).Count
# Compare to count mentioned in vibetech-agents SKILL.md
```

## MCP Server Rules

| ID      | Rule                                                                                               | Severity    | Auto-fixable    |
| ------- | -------------------------------------------------------------------------------------------------- | ----------- | --------------- |
| MCP-001 | Server entry in config must point to valid command                                                 | 🔴 Breaking | No              |
| MCP-002 | Tool `inputSchema` must have `type`, `properties`, `required`                                      | 🔴 Breaking | No              |
| MCP-003 | Environment variables in config must exist in system                                               | 🟡 Stale    | No              |
| MCP-004 | `@modelcontextprotocol/sdk` should be latest stable                                                | 🟡 Stale    | Yes             |
| MCP-005 | `package.json` must have `"type": "module"`                                                        | 🟢 Cosmetic | Yes             |
| MCP-006 | Desktop Extensions (.mcpb) format compliance                                                       | 🟡 Stale    | No              |
| MCP-007 | Servers using legacy `Server` + `setRequestHandler` should migrate to `McpServer` + `registerTool` | 🟡 Stale    | No (API change) |
| MCP-008 | `zod` must be listed as peer dependency (MCP SDK 1.27+)                                            | 🟡 Stale    | Yes             |

### Detection — SDK Version Check

```powershell
# For each MCP server package.json
$mcpPkg = Get-Content "$serverPath\package.json" | ConvertFrom-Json
$sdkVersion = $mcpPkg.dependencies.'@modelcontextprotocol/sdk'
# Compare against latest from npm registry
```

### Detection — API Pattern Check

```powershell
# Scan for legacy MCP pattern
Select-String -Path "$serverPath\src\*.ts" -Pattern 'setRequestHandler\(ListToolsRequestSchema' -SimpleMatch
# If found, flag MCP-007
```

## Supply Chain Security Rules

| ID      | Rule                                                             | Severity    | Auto-fixable       |
| ------- | ---------------------------------------------------------------- | ----------- | ------------------ |
| SEC-001 | Nx version must not be 21.5.0 or 21.6.0 (S1ngularity compromise) | 🔴 Breaking | Yes (bump to .1+)  |
| SEC-002 | Run `pnpm audit` after dependency updates                        | 🟡 Stale    | N/A (action item)  |
| SEC-003 | Lock file must exist and be current                              | 🟡 Stale    | Yes (pnpm install) |

## Skill Content Rules

| ID      | Rule                                                    | Severity    | Auto-fixable      |
| ------- | ------------------------------------------------------- | ----------- | ----------------- |
| SKL-001 | Framework version mentions must match monorepo          | 🟡 Stale    | Yes               |
| SKL-002 | Config baseline examples must match actual root configs | 🟡 Stale    | No (needs review) |
| SKL-003 | Tracked project lists must reflect actual directories   | 🟡 Stale    | Yes (re-scan)     |
| SKL-004 | SKILL.md frontmatter must have name + description       | 🔴 Breaking | No                |
| SKL-005 | Referenced scripts must exist and be executable         | 🔴 Breaking | No                |
| SKL-006 | File size under 500 lines (SKILL.md)                    | 🟢 Cosmetic | No                |

## CLAUDE.md Rules

| ID      | Rule                                                 | Severity    | Auto-fixable        |
| ------- | ---------------------------------------------------- | ----------- | ------------------- |
| CMD-001 | Listed dependencies must match app's package.json    | 🟡 Stale    | Yes                 |
| CMD-002 | Build commands must match project.json targets       | 🟡 Stale    | Yes                 |
| CMD-003 | "Known issues" should be reviewed for resolved items | 🟢 Cosmetic | No                  |
| CMD-004 | File must exist for every app in `apps/`             | 🟢 Cosmetic | No (needs creation) |

## Cross-Skill Consistency Rules

| ID      | Rule                                                        | Severity    | Auto-fixable |
| ------- | ----------------------------------------------------------- | ----------- | ------------ |
| XSK-001 | All skills referencing monorepo structure must agree        | 🟡 Stale    | No           |
| XSK-002 | Agent model IDs must be consistent across skills + configs  | 🔴 Breaking | Yes          |
| XSK-003 | MCP server names must be consistent across skills + configs | 🟡 Stale    | Yes          |
| XSK-004 | File limit (360 lines) must be stated consistently          | 🟢 Cosmetic | Yes          |

---

## Adding New Rules

When a new drift pattern is discovered:

1. Assign next ID in the appropriate category
2. Define severity based on: does it cause failure (🔴), wrong output (🟡), or just looks off (🟢)?
3. Write detection logic (PowerShell preferred)
4. Mark auto-fixable only if the fix is deterministic and safe
5. Add to this file and update `audit-ecosystem.ps1` if scripted
