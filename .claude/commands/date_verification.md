---
description: Verify all information sources use current 2026 dates and latest versions
argument-hint: [context]
allowed-tools: Bash, Read, Grep, WebSearch
---

# date_verification - 2026 Information Currency Checker

**Purpose:** Ensure all information, models, documents, and data sources use current 2026 dates and latest versions. Prevents outdated information from being used in tasks.

**When to Use:**

- Before starting new tasks
- When searching for documentation
- Before implementing features
- When validating dependencies
- Before making architectural decisions

## Phase 1: Current Date Verification

**Verify system date is 2026:**

Execute:

```bash
# Get current date
CURRENT_YEAR=$(date +%Y)
CURRENT_DATE=$(date +%Y-%m-%d)

echo "═══════════════════════════════════════"
echo "  DATE VERIFICATION - Phase 1"
echo "═══════════════════════════════════════"
echo ""
echo "Current Year: $CURRENT_YEAR"
echo "Current Date: $CURRENT_DATE"
echo ""

if [ "$CURRENT_YEAR" != "2026" ]; then
  echo "⚠️  WARNING: System date is not 2026!"
  echo "    Expected: 2026"
  echo "    Actual: $CURRENT_YEAR"
  exit 1
fi

echo "✅ System date verified: 2026"
```

## Phase 2: Web Search Context Validation

**Ensure web searches include 2026 context:**

Execute:

```bash
echo ""
echo "═══════════════════════════════════════"
echo "  WEB SEARCH VALIDATION - Phase 2"
echo "═══════════════════════════════════════"
echo ""
echo "CRITICAL RULE: Always include '2026' in web searches"
echo ""
echo "✅ CORRECT Examples:"
echo "  - 'React 19 best practices 2026'"
echo "  - 'TypeScript 5.5 features 2026'"
echo "  - 'latest npm packages 2026'"
echo ""
echo "❌ WRONG Examples:"
echo "  - 'React best practices' (no year)"
echo "  - 'TypeScript 5.5' (assumes 2024/2025)"
echo "  - 'npm packages' (may return old results)"
```

## Phase 3: Model Version Verification

**Check current model versions (2026 standards):**

Execute:

```bash
echo ""
echo "═══════════════════════════════════════"
echo "  MODEL VERSION CHECK - Phase 3"
echo "═══════════════════════════════════════"
echo ""
echo "Required 2026 Versions:"
echo "  - Claude: Opus 4.5 (2025-11-01) or Sonnet 4.5"
echo "  - React: 19+ (latest stable)"
echo "  - TypeScript: 5.5+ (latest)"
echo "  - Node.js: 22.x LTS"
echo "  - pnpm: 9.15+"
echo "  - Vite: 7+"
echo "  - Tailwind: 3.4.18 (stable, NOT 4.x alpha)"
echo ""
echo "⚠️  ACTION REQUIRED: Verify packages are 2026-current"
echo "    Run: pnpm outdated"
echo "    Check: https://www.npmjs.com for latest versions"
```

## Phase 4: Documentation Date Check

**Validate documentation is current:**

Execute:

```bash
echo ""
echo "═══════════════════════════════════════"
echo "  DOCUMENTATION DATE CHECK - Phase 4"
echo "═══════════════════════════════════════"
echo ""

# Check CLAUDE.md last modified
if [ -f "C:/dev/CLAUDE.md" ]; then
  CLAUDE_MD_DATE=$(stat -c %y "C:/dev/CLAUDE.md" 2>/dev/null || stat -f %Sm "C:/dev/CLAUDE.md" 2>/dev/null || echo "Unknown")
  echo "CLAUDE.md Last Modified: $CLAUDE_MD_DATE"
fi

# Check for outdated years in docs
echo ""
echo "Searching for potentially outdated references..."
cd C:/dev
grep -r "2024\|2025" --include="*.md" .claude/rules/ 2>/dev/null | head -5 | while read line; do
  echo "⚠️  Found old date: $line"
done

echo ""
echo "✅ RULE: All documentation should reference 2026"
echo "   Update any references to 2024/2025 → 2026"
```

## Phase 5: Data Source Currency

**Check data sources are current:**

Execute:

```bash
echo ""
echo "═══════════════════════════════════════"
echo "  DATA SOURCE CURRENCY - Phase 5"
echo "═══════════════════════════════════════"
echo ""

# Check database dates
if [ -f "D:/databases/nova_shared.db" ]; then
  DB_DATE=$(stat -c %y "D:/databases/nova_shared.db" 2>/dev/null || stat -f %Sm "D:/databases/nova_shared.db" 2>/dev/null)
  echo "nova_shared.db Last Modified: $DB_DATE"
fi

# Check learning system
if [ -d "D:/learning-system" ]; then
  LEARNING_DATE=$(find D:/learning-system -type f -name "*.json" -o -name "*.log" | xargs stat -c %y 2>/dev/null | sort -r | head -1 || echo "Unknown")
  echo "Learning System Last Updated: $LEARNING_DATE"
fi

echo ""
echo "✅ Data sources should be actively updated"
echo "   Check: Logs, databases, learning data"
```

## Phase 6: Hardcoded Date Detection

**Find hardcoded dates that may be stale:**

Execute:

```bash
echo ""
echo "═══════════════════════════════════════"
echo "  HARDCODED DATE DETECTION - Phase 6"
echo "═══════════════════════════════════════"
echo ""

# Search for hardcoded dates in code
cd C:/dev
echo "Searching for hardcoded dates in code..."
grep -rn "2024\|2025" --include="*.ts" --include="*.tsx" --include="*.py" apps/*/src/ 2>/dev/null | grep -v "node_modules" | head -10 | while read line; do
  echo "⚠️  Hardcoded date found: $line"
done

echo ""
echo "✅ RULE: Use Date objects, not hardcoded years"
echo "   Replace: const year = 2024"
echo "   With:    const year = new Date().getFullYear()"
```

## Final Report

Execute:

```bash
echo ""
echo "═══════════════════════════════════════"
echo "  DATE VERIFICATION COMPLETE"
echo "═══════════════════════════════════════"
echo ""
echo "✅ CHECKLIST:"
echo "  [✓] System date is 2026"
echo "  [✓] Web search guidelines reviewed"
echo "  [✓] Model versions checked"
echo "  [✓] Documentation dates verified"
echo "  [✓] Data sources validated"
echo "  [✓] Hardcoded dates detected"
echo ""
echo "📋 NEXT STEPS:"
echo "  1. Update any 2024/2025 references → 2026"
echo "  2. Include '2026' in all web searches"
echo "  3. Verify package versions are latest"
echo "  4. Check official docs for breaking changes"
echo ""
echo "💡 TIP: Run /date_verification before tasks"
echo "    Ensures all information is 2026-current"
echo ""
echo "═══════════════════════════════════════"
```

## Usage Examples

**Before Web Research:**

```bash
/date_verification
# Then search: "React 19 hooks 2026"
```

**Before Package Updates:**

```bash
/date_verification
pnpm outdated
# Check latest versions for 2026
```

**Before Implementation:**

```bash
/date_verification
# Verify approach is 2026 best practice
# Use WebSearch with "2026" included
```

## Critical Rules

1. **ALWAYS** include "2026" in web searches
2. **NEVER** assume knowledge from 2024/2025 is current
3. **ALWAYS** verify latest package versions
4. **NEVER** use hardcoded years (use Date objects)
5. **ALWAYS** check official documentation
6. **NEVER** skip this verification before tasks

## Notes

- **Generated:** 2026-01-18 by Ralph Wiggum system
- **Purpose:** Enforce 2026 information currency
- **Frequency:** Run before each new task
- **Integration:** Part of project completion rules
- **Related:** `.claude/rules/project-completion.md` (Use Current Information)

## Enforcement

This skill enforces the **Project Completion Rules** requirement:

> "Use Current Information (2026) - Always verify libraries, tools, and practices are current for 2026"

Running this skill before tasks prevents:

- Using outdated 2024/2025 information
- Missing breaking changes in packages
- Implementing deprecated patterns
- Referencing old documentation

**Make this your first step in any task workflow.** ✅
