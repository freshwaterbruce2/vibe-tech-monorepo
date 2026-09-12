# CODEX AGENT MANDATORY INSTRUCTIONS

## ⚠️ CRITICAL: READ BEFORE ANY CODE CHANGES ⚠️

**These instructions are mandatory for every Codex agent working in this repository.**

---

## 🔴 IMMEDIATE ACTIONS BEFORE ANY TASK

### 1. **CHECK MONOREPO RULES**

```powershell
# ALWAYS read the main rules first
Get-Content -Raw AI.md
```

### 2. **VERIFY YOUR CODEX ROLE**

- **Codex master agent**: Own planning, integration, safety decisions, and final verification.
- **Codex worker agent**: Implement only the explicitly assigned files or responsibility.
- **Codex reviewer agent**: Review independently and report findings without expanding scope.

---

## 📋 MANDATORY WORKFLOW

### **STEP 1: ASSESSMENT**

Before touching ANY code:

1. Count files to be modified
2. Check line count of existing files (500 soft / 1000 hard)
3. Determine if planning is required (3+ files)

### **STEP 2: PLANNING (CODEX PLAN OWNER)**

If you own planning and planning is needed:

```yaml
Create Plan:
  - Location: docs/plans/
  - Format: YYYY-MM-DD-<task-slug>.md
  - Contents:
      - Affected files list
      - Line count verification
      - Module breakdown strategy
      - Risk assessment
      - Testing approach
```

### **STEP 3: EXECUTION (ASSIGNED CODEX WORKER)**

If you are an assigned Codex worker:

1. **READ the task plan** and honor any recorded approval gate
2. **STAY within assigned ownership** - report any required scope expansion
3. **ENFORCE line limits** - split files over 500/1000 lines
4. **MAINTAIN file names** - never rename existing files

---

## 🚨 HARD RULES - NO EXCEPTIONS

### **FILE SIZE ENFORCEMENT**

```python
# Before editing ANY file:
if file_lines > 1000:
    STOP - File must be split into modules (warns at 500 lines)

# Before creating ANY file:
if estimated_lines > 1000:
    STOP - Design as multiple modules
```

### **FILE NAME IMMUTABILITY**

```javascript
// FORBIDDEN OPERATIONS:
// ❌ rename('oldFile.ts', 'newFile.ts')
// ❌ mv oldFile.ts newFile.ts
// ❌ git mv oldFile.ts newFile.ts

// ALLOWED OPERATIONS:
// ✅ Create new files
// ✅ Delete obsolete files (with approval)
// ✅ Modify file contents
```

### **MODULAR ARCHITECTURE**

Every file must follow:

```typescript
// MAX 500 LINES SOFT / 1000 LINES HARD
// Single responsibility
// Clear interfaces
// Dependency injection
// No god objects
```

### **DATA STORAGE - D:\ DRIVE MANDATORY**

```yaml
# ALL DATA MUST GO TO D:\ DRIVE
REQUIRED_PATHS:
  logs:        "D:\\logs\\[project-name]\\"
  databases:   "D:\\databases\\[project-name]\\"
  data_files:  "D:\\data\\[project-name]\\"
  learning:    "D:\\learning-system\\[project-name]\\"
  backups:     "D:\\backups\\[project-name]\\"
  temp:        "D:\\temp\\[project-name]\\"

FORBIDDEN:
  - ❌ NEVER store logs in V:\monorepo\
  - ❌ NEVER put databases in project folders
  - ❌ NEVER save data files in repository
  - ❌ NEVER place ML models in source code

EXAMPLES:
  # ✅ CORRECT:
  log_path: "D:\\logs\\vibe-code-studio\\app.log"
  db_path:  "D:\\databases\\nova-agent\\main.db"

  # ❌ WRONG:
  log_path: "./logs/app.log"
  db_path:  "V:\\monorepo\\apps\\nova-agent\\database.db"
```

---

## 🎯 AGENT-SPECIFIC BEHAVIORS

### **For the Codex Master Agent:**

- **PRIMARY ROLE**: Planning, architecture, integration, and final verification
- **DELEGATE**: Complex or independent work with explicit ownership boundaries
- **ALWAYS**: Create or update a task-specific plan before complex execution
- **OUTPUT**: Planning documents in `docs/plans/`

### **For Codex Worker Agents:**

- **PRIMARY ROLE**: Code Implementation
- **NEVER**: Expand scope or make unassigned architectural decisions independently
- **ALWAYS**: Follow the task plan and assigned ownership boundary
- **OUTPUT**: Clean, modular code following the plan

### **For All Agents:**

- **USE THE PLAN FILE**: Track task progress in `docs/plans/` when planning is required
- **CHECK line count**: Before and after edits
- **VALIDATE structure**: Ensure modular architecture
- **PRESERVE names**: Never rename existing files

---

## 🛠️ HELPER COMMANDS

### **Check File Line Count:**

```bash
# PowerShell command
powershell -Command "(Get-Content 'filepath').Count"
```

### **Validate All Files:**

```bash
# Check for oversized files
pnpm run lines:check
```

### **Check Planning Requirement:**

```powershell
# Count affected files
@(git diff --name-only).Count
```

### **Verify D:\ Drive Paths:**

```bash
# PowerShell: Check if data directories exist
powershell -Command "Test-Path 'D:\logs', 'D:\databases', 'D:\data'"

# Create project data directories
powershell -Command "New-Item -Path 'D:\logs\[project-name]' -ItemType Directory -Force"
```

---

## ⚡ QUICK DECISION TREE

```
START
  │
  ├─ How many files affected?
  │   ├─ 1-2 files → Proceed with caution
  │   └─ 3+ files → STOP! Planning required
  │
  ├─ File over 1000 lines?
  │   ├─ Yes → STOP! Must split (warns at 500)
  │   └─ No → Continue
  │
  ├─ Need to rename file?
  │   ├─ Yes → STOP! Forbidden
  │   └─ No → Continue
  │
  ├─ Storing logs/data/databases?
  │   ├─ Yes → MUST use D:\ drive
  │   └─ No → Continue
  │
  └─ What's my role?
      ├─ Codex master → Plan, delegate, integrate, and verify
      ├─ Codex worker → Implement only assigned ownership
      └─ Codex reviewer → Review and report findings
```

---

## 🔥 ENFORCEMENT NOTICES

**VIOLATIONS WILL RESULT IN:**

1. Immediate rejection of code
2. Rollback of changes
3. Required re-implementation
4. Logged as non-compliance

**NO OVERRIDES AVAILABLE**

---

## 📝 METADATA

- **Rules Version**: 2.0.0
- **Last Updated**: August 23, 2026
- **Enforcement Level**: MANDATORY
- **Override Authority**: NONE

---

## 🆘 WHEN IN DOUBT

1. **READ** `AI.md`
2. **CHECK** file sizes with validation scripts
3. **ASK** for clarification before proceeding
4. **PLAN** thoroughly for complex changes
5. **FOLLOW** your designated role strictly

**Remember: These rules ensure code quality, maintainability, and consistency across the entire monorepo. They are not suggestions - they are requirements.**
