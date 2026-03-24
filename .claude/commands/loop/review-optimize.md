---
description: Read-only code review loop - generates per-project reports with no changes
allowed-tools: Bash, Read, Glob, Grep
---

# Loop Review Optimize - Read-Only Code Review

Reviews ONE Nx project per turn and appends findings to the review report. Makes NO changes to any files in the repository.

## CRITICAL: READ-ONLY

This loop makes ZERO changes to the codebase:

- NO file edits
- NO git commits
- NO git add/stage
- NO dependency changes
- NO file creation in the repo

The ONLY file written to is the review report at `D:\logs\loop-sessions\YYYYMMDD\review-report.md`.

## Per-Turn Workflow

### 1. Select Next Project

```bash
SESSION_DIR="D:/logs/loop-sessions/$(date +%Y%m%d)"
```

Read the current review report to see which projects have already been reviewed:

```bash
grep "^|" "$SESSION_DIR/review-report.md" | grep -v "Project" | grep -v "---" | awk -F'|' '{print $2}' | tr -d ' '
```

Get project list:

```bash
npx nx show projects 2>/dev/null | sort
```

Pick the first project NOT yet in the report. If all reviewed, STOP:

```
[review-optimize] All projects reviewed. Stopping.
```

### 2. Gather Project Info

For the selected project, run these checks:

#### 2a. Dependency Health

```bash
pnpm --filter PROJECT_NAME outdated 2>&1 | tail -20
```

Count: total outdated, major updates, minor updates.

#### 2b. File Metrics

```bash
# Find source files and count lines
PROJECT_ROOT=$(npx nx show project PROJECT_NAME --json 2>/dev/null | grep -o '"root":"[^"]*"' | cut -d'"' -f4)
find "C:/dev/$PROJECT_ROOT/src" -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.rs" 2>/dev/null | head -100 | while read f; do wc -l "$f"; done | sort -rn | head -10
```

Flag files > 300 lines as "large files".

#### 2c. Anti-Pattern Scan

Search for common anti-patterns in the project:

```bash
# console.log statements (not in test files)
grep -rn "console\.log" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|spec\|__test" | wc -l
```

```bash
# 'any' type usage
grep -rn ": any" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
```

```bash
# TODO/FIXME/HACK comments
grep -rn "TODO\|FIXME\|HACK" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null | wc -l
```

```bash
# Deep relative imports (../../../)
grep -rn '"\.\./\.\./\.\.' "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
```

```bash
# Hardcoded D:\ or C:\ paths in source
grep -rn '[CD]:\\\\' "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null | wc -l
```

#### 2d. Security Scan

```bash
# Hardcoded secrets patterns
grep -rn "api[_-]key\s*=\s*['\"]" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null | grep -vi "process\.env\|import\|interface\|type " | wc -l
```

```bash
# eval() usage
grep -rn "eval(" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
```

```bash
# innerHTML usage
grep -rn "innerHTML\|dangerouslySetInnerHTML" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
```

```bash
# HTTP (non-HTTPS) URLs
grep -rn "http://" "C:/dev/$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "localhost\|127\.0\.0\.1\|0\.0\.0\.0" | wc -l
```

### 3. Generate Report Entry

Calculate a simple score:

- **Complexity**: LOW (<10 files), MEDIUM (10-30), HIGH (>30)
- **Anti-Patterns**: count of console.log + any + TODO + deep imports
- **Security**: count of hardcoded keys + eval + innerHTML + HTTP URLs
- **Status**: CLEAN (0 issues), NEEDS_ATTENTION (1-10), WARNING (>10)

### 4. Append to Report

Append to `D:\logs\loop-sessions\YYYYMMDD\review-report.md`:

First the summary table row:

```
| PROJECT_NAME | COMPLEXITY | ANTI_PATTERN_COUNT | SECURITY_COUNT | STATUS |
```

Then a detailed section:

```markdown
## PROJECT_NAME

**Root:** `PROJECT_ROOT`
**Complexity:** X files, largest: filename (N lines)

### Dependency Health

- Outdated packages: N (M major updates)
- [list top 3 outdated if any]

### Anti-Patterns Found

- console.log: N occurrences
- `any` types: N occurrences
- TODO/FIXME: N occurrences
- Deep imports: N occurrences
- Hardcoded paths: N occurrences

### Security Concerns

- Hardcoded secrets: N
- eval() usage: N
- innerHTML/dangerouslySetInnerHTML: N
- HTTP URLs: N

### Large Files (>300 lines)

- [list files]

### Recommendations

1. [Actionable recommendation based on findings]
2. [Second recommendation if applicable]

---
```

### 5. Log

```bash
echo "[$(date -Iseconds)] [review-optimize] [PROJECT_NAME] reviewed: anti-patterns=N, security=N, status=STATUS" >> "$SESSION_DIR/loop.log"
```

## Notes

- This loop has NO commit budget (it never commits)
- It only writes to `D:\logs\loop-sessions\YYYYMMDD\review-report.md`
- Run this as the last/lowest-priority loop
- The report is the main deliverable for morning review
- If a project has no `src/` directory, note it as "no source" and move on
