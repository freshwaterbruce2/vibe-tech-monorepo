# 🤖 CLAUDE AGENT MANDATORY INSTRUCTIONS

## ⚠️ CRITICAL: READ BEFORE ANY CODE CHANGES ⚠️

**These instructions are MANDATORY for all Claude AI agents working in this repository.**

---

## 🔴 IMMEDIATE ACTIONS BEFORE ANY TASK

### 1. **CHECK WORKSPACE RULES**

```bash
# ALWAYS read the canonical rules first
cat AI.md
cat docs/ai/WORKSPACE.md
```

### 2. **UNDERSTAND YOUR CONTEXT**

- Read relevant `.claude/rules/*.md` files for the area you're working in
- Check project-specific `apps/<name>/AI.md` if it exists
- Review recent git commits to understand current work

---

## 📋 MANDATORY WORKFLOW

### **STEP 1: ASSESSMENT**

Before touching ANY code:

1. Count files to be modified
2. Check line count of existing files (max 500 lines per file)
3. Verify data storage locations (D:\ for data, C:\dev for code)
4. Check if similar functionality already exists (no duplicates rule)

### **STEP 2: PLANNING**

For complex changes (3+ files or uncertain scope):

1. Use TodoWrite to create a task list
2. Break down the work into small, manageable steps
3. Identify affected files and potential impacts
4. Consider using EnterPlanMode for complex implementations

### **STEP 3: EXECUTION**

1. **FOLLOW the no-duplicates rule** - search before creating
2. **ENFORCE line limits** - max 500 lines per file
3. **USE proper paths** - D:\ for data, C:\dev for code
4. **MAINTAIN file names** - avoid renaming existing files
5. **TEST as you go** - run quality checks incrementally

---

## 🚨 HARD RULES - NO EXCEPTIONS

### **FILE SIZE ENFORCEMENT**

```python
# Before editing ANY file:
if file_lines > 500:
    STOP - File must be split into modules

# Before creating ANY file:
if estimated_lines > 500:
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
// MAX 500 LINES PER FILE
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
  learning:    "D:\\learning\\[project-name]\\"
  backups:     "D:\\backups\\[project-name]\\"
  temp:        "D:\\temp\\[project-name]\\"

FORBIDDEN:
  - ❌ NEVER store logs in C:\dev\
  - ❌ NEVER put databases in project folders
  - ❌ NEVER save data files in repository
  - ❌ NEVER place ML models in source code

EXAMPLES:
  # ✅ CORRECT:
  log_path: "D:\\logs\\vibe-code-studio\\app.log"
  db_path:  "D:\\databases\\nova-agent\\main.db"

  # ❌ WRONG:
  log_path: "./logs/app.log"
  db_path:  "C:\\dev\\apps\\nova-agent\\database.db"
```

---

## 🎯 AGENT-SPECIFIC BEHAVIORS

### **For Claude Opus 4.1 / Claude Code:**

- **PRIMARY ROLE**: Planning and Architecture
- **NEVER**: Write implementation code directly
- **ALWAYS**: Create detailed plans before delegation
- **OUTPUT**: Planning documents in `.deepcode/plans/`

### **For Claude Sonnet 4.5:**

- **PRIMARY ROLE**: Code Implementation
- **NEVER**: Make architectural decisions independently
- **ALWAYS**: Request plan from Opus for 3+ file changes
- **OUTPUT**: Clean, modular code following the plan

### **For All Agents:**

- **USE TodoWrite**: Track all tasks and progress
- **CHECK line count**: Before and after edits
- **VALIDATE structure**: Ensure modular architecture
- **PRESERVE names**: Never rename existing files

---

## 🛠️ HELPER COMMANDS

### **Development:**

```bash
# Start development server
pnpm run dev

# Run quality checks (lint + typecheck + build)
pnpm run quality

# Run tests
pnpm run test
```

### **Check File Line Count:**

```bash
# Check line count of a file
wc -l filepath

# Or use Read tool and count lines
```

### **Nx Commands:**

```bash
# Build all projects
pnpm nx run-many -t build

# Test affected projects
pnpm nx affected -t test

# Show project graph
pnpm nx graph
```

### **Verify D:\ Drive Paths:**

```bash
# Check if data directories exist
ls -la D:/databases/
ls -la D:/logs/

# Create project data directories (if needed)
mkdir -p D:/logs/[project-name]
mkdir -p D:/databases/[project-name]
```

---

## ⚡ QUICK DECISION TREE

```
START
  │
  ├─ Does similar functionality exist?
  │   ├─ Yes → MODIFY existing, don't duplicate
  │   └─ No → Continue
  │
  ├─ How many files affected?
  │   ├─ 1-2 files → Proceed with caution
  │   └─ 3+ files → Use TodoWrite and plan carefully
  │
  ├─ File over 500 lines?
  │   ├─ Yes → STOP! Must split into modules
  │   └─ No → Continue
  │
  ├─ Storing logs/data/databases?
  │   ├─ Yes → MUST use D:\ drive paths
  │   └─ No → Continue
  │
  └─ Ready to implement?
      ├─ Complex task → Use EnterPlanMode
      └─ Simple task → Proceed with implementation
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

- **Rules Version**: 1.1.0
- **Last Updated**: January 18, 2026
- **Enforcement Level**: MANDATORY
- **Override Authority**: NONE

---

## 🆘 WHEN IN DOUBT

1. **READ** `AI.md` and `docs/ai/WORKSPACE.md`
2. **CHECK** `.claude/rules/` for specific guidance
3. **SEARCH** before creating (no duplicates rule)
4. **ASK** for clarification before proceeding
5. **USE** TodoWrite for complex tasks

**Remember: These rules ensure code quality, maintainability, and consistency across the entire monorepo. They are not suggestions - they are requirements.**

## 📚 KEY DOCUMENTATION

- **Canonical Rules:** `AI.md` (single source of truth)
- **Workspace Guide:** `docs/ai/WORKSPACE.md`
- **Specific Rules:** `.claude/rules/*.md`
- **Project Overrides:** `apps/<name>/AI.md`
- **Version Control:** `.claude/rules/version-control.md` (GitHub)
- **Paths Policy:** `.claude/rules/paths-policy.md` (C:\ vs D:\)
- **Testing:** `.claude/rules/testing-strategy.md`
