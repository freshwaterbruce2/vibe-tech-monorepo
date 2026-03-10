# No Duplicates Rule

Last Updated: 2026-01-07
Priority: CRITICAL - SYSTEM-WIDE
Enforcement: MANDATORY before ANY file/feature creation
Scope: ALL projects in monorepo (apps, packages, backend, tools)

**THIS RULE IS ENFORCED SYSTEM-WIDE. NO EXCEPTIONS.**

---

## 🚨 ALWAYS Check Before Creating

Before creating ANY file, feature, or implementation:

### 1. Search for Existing Implementation

```bash
# Search for similar features
Grep pattern="feature name" path="apps/vibe-code-studio"

# Search for similar files
Glob pattern="**/*feature*.ts"

# Check for similar functionality
Grep pattern="function.*Feature" output_mode="files_with_matches"
```

### 2. Read Existing Files

If similar files found:

- **Read the file completely**
- Understand what it does
- Determine if modification is needed instead of creation
- Ask user if unsure whether to modify or create new

### 3. Check Feature Specifications

Before implementing ANY feature:

- Check `FEATURE_SPECS/` directory
- Check project CLAUDE.md
- Search for existing implementations
- Verify feature isn't already completed

---

## ❌ NEVER Do This

1. **Don't create without searching**

   ```
   ❌ User: "add tab completion"
   ❌ Assistant: *immediately creates files*

   ✅ User: "add tab completion"
   ✅ Assistant: *searches for existing tab completion*
   ✅ Assistant: *finds it already exists, modifies instead*
   ```

2. **Don't assume features are missing**

   ```
   ❌ "I'll create the auto-fix feature"
   ✅ "Let me check if auto-fix exists... [searches]"
   ✅ "Auto-fix already exists in X, I'll enhance it"
   ```

3. **Don't create files without checking**

   ```
   ❌ Write new file immediately
   ✅ Glob + Grep to find similar files first
   ✅ Read existing files to understand
   ✅ Only create if truly needed
   ```

---

## ✅ Correct Workflow

### Before ANY File Creation

1. **Search codebase**

   ```
   Grep pattern="similar feature name"
   Glob pattern="**/*similar*.ts"
   ```

2. **Check specs/docs**

   ```
   Read FEATURE_SPECS/*.md
   Read project CLAUDE.md
   Check tasks/todos
   ```

3. **Verify with user if unclear**

   ```
   "I found X that does Y. Should I:
   a) Modify X to add Z?
   b) Create new file because...?"
   ```

4. **Only then create**

   ```
   Write file only if:
   - No similar file exists
   - User confirmed creation
   - Feature is truly new
   ```

---

## 📋 Pre-Creation Checklist

Before creating ANY file, verify:

- [ ] Searched for similar files (Glob + Grep)
- [ ] Read any similar implementations found
- [ ] Checked FEATURE_SPECS/ directory
- [ ] Reviewed project CLAUDE.md
- [ ] Verified feature isn't already done
- [ ] Asked user if modification vs creation is unclear
- [ ] Confirmed no duplicate functionality exists

**If ANY checkbox is unchecked → DON'T CREATE**

---

## 🔍 Common Duplicate Scenarios

### Scenario 1: Feature Already Exists

```
User: "add error auto-fix"

WRONG:
- Create auto-fix files immediately

RIGHT:
- Search: Grep pattern="auto.*fix"
- Find: ERROR_AUTOFIX_SPEC.md exists
- Check: test-autofix.ts exists
- Response: "Auto-fix already exists, I'll enhance it"
```

### Scenario 2: Similar File Exists

```
User: "create AI completion handler"

WRONG:
- Write ai-completion-handler.ts

RIGHT:
- Search: Glob pattern="**/*ai*.ts"
- Find: ai-handler.ts exists
- Read: ai-handler.ts to understand
- Response: "ai-handler.ts exists, I'll update it"
```

### Scenario 3: Different Features, Similar Names

```
User: "add tab completion"

WRONG:
- Assume it's auto-fix (similar name)
- Skip implementation thinking it's done

RIGHT:
- Search: Grep pattern="tab completion"
- Search: Grep pattern="Monacopilot"
- Distinguish: Tab completion ≠ Auto-fix
- Implement: Correct feature
```

---

## 🎯 Search Patterns to Always Use

### For Features

```
Grep pattern="feature-keyword" output_mode="files_with_matches"
Grep pattern="class.*FeatureName"
Grep pattern="function.*featureName"
```

### For Files

```
Glob pattern="**/*keyword*.ts"
Glob pattern="**/*keyword*.tsx"
Glob pattern="**/*keyword*.spec.ts"
```

### For Specs

```
Read FEATURE_SPECS/
Read project CLAUDE.md
Grep pattern="specification" path="docs/"
```

---

## 💡 User Communication

When similar features found:

**Good Response:**

```
"I found that [feature] already exists in [file].
I can either:
1. Enhance the existing implementation
2. Create a new separate feature if this is different

Which would you prefer?"
```

**Bad Response:**

```
*silently creates duplicate*
*user finds out later*
*wasted effort*
```

---

## 🚀 Tools to Use

**Before creating ANY file:**

1. **Glob** - Find files by pattern

   ```
   Glob pattern="**/*feature*.ts"
   ```

2. **Grep** - Search code for functionality

   ```
   Grep pattern="feature.*implementation"
   ```

3. **Read** - Understand existing code

   ```
   Read file_path="existing-file.ts"
   ```

4. **Ask** - Clarify with user

   ```
   AskUserQuestion about modify vs create
   ```

---

## ⚖️ Modify vs Create Decision Tree

```
Found similar file/feature?
    ├─ Yes → Read it completely
    │   ├─ Same feature? → MODIFY existing
    │   ├─ Different feature? → CREATE new
    │   └─ Unclear? → ASK user
    └─ No → Safe to CREATE
```

---

## 📊 Examples

### Example 1: Prevented Duplicate

```
User: "add AI completion"
Search: Grep pattern="AI.*completion"
Found: ai-handler.ts with completion endpoint
Action: Modified ai-handler.ts instead
Result: ✅ No duplicate created
```

### Example 2: Detected Different Feature

```
User: "add auto-fix"
Search: Grep pattern="auto.*fix"
Found: ERROR_AUTOFIX_SPEC.md (already done)
Action: Confirmed feature complete
Result: ✅ No duplicate work
```

### Example 3: Correctly Created New

```
User: "add screenshot tool"
Search: Grep pattern="screenshot"
Found: Nothing related to screenshots
Action: Created new feature
Result: ✅ Legitimate new file
```

---

## 🔒 Enforcement

This rule is **MANDATORY** and applies to:

- All file creation (ts, tsx, md, etc.)
- All feature implementation
- All component creation
- All service/handler creation
- All test file creation

**Violation = Duplicate work = User frustration**

---

**Remember:** 5 minutes of searching prevents hours of duplicate work.

---

_Last Updated_: January 7, 2026
_Trigger_: Before ANY file/feature creation
_Compliance_: 100% required
