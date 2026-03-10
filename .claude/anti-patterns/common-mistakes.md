# Common Mistakes & Anti-Patterns

**Category:** Anti-Pattern
**Tags:** #mistakes #antipatterns #avoid
**Last Updated:** 2025-12-29

## Storage & Paths

### ❌ Storing Data in C:\dev

**Problem:** Mixing source code with databases/logs.

```typescript
// WRONG: Database in source tree
const db = new Database('./data/app.db');

// WRONG: Logs in source tree
const logPath = path.join(__dirname, '../logs/app.log');
```

**Correct:**

```typescript
// RIGHT: Database on D:\ drive
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';
const db = new Database(DB_PATH);

// RIGHT: Logs on D:\ drive
const LOG_PATH = process.env.LOGS_PATH || 'D:\\logs\\app.log';
```

**Why:** Data files shouldn't be version controlled, and mixing them with code causes large repos and accidental commits.

**Reference:** `.claude/patterns/core/database-storage.md`

---

### ❌ Hardcoded Absolute Paths

**Problem:** Code only works on one machine.

```typescript
// WRONG: Hardcoded Windows path
import { readFile } from 'fs';
const config = readFile('C:\\dev\\config.json');

// WRONG: Hardcoded D:\ path
const dbPath = 'D:\\databases\\app.db';
```

**Correct:**

```typescript
// RIGHT: Relative to project root
import { readFile } from 'fs';
import path from 'path';
const configPath = path.join(__dirname, '../config.json');
const config = readFile(configPath);

// RIGHT: Use environment variable
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';
```

---

### ❌ Using Deprecated D:\learning Path

**Problem:** Old path is deprecated as of 2025-12-24.

```python
# WRONG: Deprecated path
learning_path = r'D:\learning\analytics'

# RIGHT: New path structure
learning_path = os.getenv('LEARNING_SYSTEM_PATH', r'D:\learning-system\analytics')
```

**Migration:** See `docs/PATHS_POLICY.md`

---

## Git Workflow

### ❌ Bypassing Pre-commit Hooks

**Problem:** Skipping quality gates leads to broken builds.

```bash
# WRONG: Bypass all hooks
git commit --no-verify -m "quick fix"

# WRONG: Bypass specific checks
git commit -m "fix" --no-gpg-sign
```

**When to use:**

- Emergency production hotfix (with team approval)
- After manual validation of ALL checks

**Better:**

```bash
# Fix the issues instead of bypassing
pnpm run quality:fix
git add .
git commit -m "fix: resolved linting issues"
```

---

### ❌ Long-Lived Feature Branches

**Problem:** Massive merge conflicts after weeks of divergence.

```bash
# WRONG: Feature branch with 50+ commits not merged to main
git checkout feature/my-branch
# ... 50 commits later ...
git merge main  # 147 merge conflicts!
```

**Correct:**

```bash
# RIGHT: Incremental merge every 10 commits
git commits-ahead  # Shows: "15 commits ahead"
git imerge         # Merge to main (5 conflicts instead of 147)
```

**Reference:** `.claude/patterns/core/monorepo-workflow.md`

---

### ❌ Vague Commit Messages

**Problem:** Useless Git history for debugging.

```bash
# WRONG: No context
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "wip"
```

**Correct:**

```bash
# RIGHT: Conventional commits
git commit -m "fix(crypto): correct nonce generation to use nanoseconds"
git commit -m "feat(vibe-tutor): add music player with offline support"

# OR: Use AI-powered commit messages
/git:smart-commit
```

---

## Code Organization

### ❌ Deep Relative Imports

**Problem:** Brittle imports that break when files move.

```typescript
// WRONG: Deep relative imports
import { auth } from '../../../utils/auth';
import { db } from '../../../../database/connection';
```

**Correct:**

```typescript
// RIGHT: Use TypeScript path aliases (when tsconfig.base.json exists)
import { auth } from '@vibetech/auth';
import { db } from '@vibetech/database';

// OR: Restructure to avoid deep nesting
import { auth } from '@/utils/auth'; // @ = src root
```

**Future:** Add to `tsconfig.base.json` (see `.claude/patterns/core/database-storage.md` lines 216-229)

---

### ❌ Files Over 500 Lines

**Problem:** Large files are hard to test, review, and maintain.

```typescript
// WRONG: 800-line component file
export function MassiveComponent() {
  // 800 lines of code...
}
```

**Correct:**

```typescript
// RIGHT: Split into smaller files
// components/UserProfile/index.tsx (50 lines)
// components/UserProfile/UserAvatar.tsx (30 lines)
// components/UserProfile/UserBio.tsx (40 lines)
// components/UserProfile/hooks/useUserData.ts (60 lines)
```

**Validation:**

```bash
node scripts/check-line-limits.mjs --staged --max 500
```

**Reference:** `C:\dev\CLAUDE.md` (line 9)

---

## Nx & Monorepo

### ❌ Running All Projects Instead of Affected

**Problem:** Wastes time and CI resources.

```bash
# WRONG: Build everything (slow)
pnpm nx run-many -t build --all

# WRONG: Test everything
pnpm nx run-many -t test --all
```

**Correct:**

```bash
# RIGHT: Only affected projects
pnpm nx affected:build
pnpm nx affected:test

# OR: Use quality shortcut
pnpm run quality:affected
```

**Reference:** `.claude/patterns/core/nx-commands.md`

---

### ❌ Not Using Project Tags

**Problem:** Can't filter projects by category.

```json
// WRONG: No tags in project.json
{
  "name": "my-app",
  "targets": { ... }
}
```

**Correct:**

```json
// RIGHT: Descriptive tags
{
  "name": "my-app",
  "tags": ["react", "web", "database", "filesystem"],
  "targets": { ... }
}
```

**Usage:**

```bash
pnpm nx run-many -t test --projects=tag:database
```

---

## Testing

### ❌ Skipping Tests

**Problem:** Broken code reaches production.

```bash
# WRONG: Skip tests
git commit -m "fix" --no-verify
pnpm run build  # No test run
```

**Correct:**

```bash
# RIGHT: Run tests before commit
pnpm run test
pnpm run quality
git commit -m "fix: resolved issue"
```

---

### ❌ Flaky Tests

**Problem:** Tests that sometimes pass, sometimes fail.

```typescript
// WRONG: Time-dependent test
test('should complete within 100ms', async () => {
  const start = Date.now();
  await someAsyncOperation();
  expect(Date.now() - start).toBeLessThan(100); // Flaky!
});

// WRONG: Test depends on order
test('second test', () => {
  expect(globalState).toBe(5); // Depends on first test!
});
```

**Correct:**

```typescript
// RIGHT: Deterministic test
test('should complete successfully', async () => {
  const result = await someAsyncOperation();
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
});

// RIGHT: Isolated tests
beforeEach(() => {
  globalState = 0; // Reset before each test
});
```

---

## Security

### ❌ Hardcoded Credentials

**Problem:** API keys committed to Git.

```typescript
// WRONG: Credentials in code
const API_KEY = 'abc123xyz789';
const SECRET = 'mysecret';
```

**Correct:**

```typescript
// RIGHT: Environment variables
const API_KEY = process.env.KRAKEN_API_KEY;
const SECRET = process.env.KRAKEN_SECRET_KEY;

if (!API_KEY || !SECRET) {
  throw new Error('Missing required environment variables');
}
```

**.env.example:**

```bash
KRAKEN_API_KEY=your_key_here
KRAKEN_SECRET_KEY=your_secret_here
```

**.gitignore:**

```
.env
.env.local
```

---

### ❌ Sensitive Data in Logs

**Problem:** Exposing secrets via log files.

```python
# WRONG: Logging sensitive data
logger.info(f"API Key: {api_key}")
logger.debug(f"Request: {json.dumps(request_with_secret)}")
```

**Correct:**

```python
# RIGHT: Redact sensitive fields
def sanitize_log(data):
    sanitized = data.copy()
    for key in ['api_key', 'secret', 'password', 'token']:
        if key in sanitized:
            sanitized[key] = '***REDACTED***'
    return sanitized

logger.info(f"Request: {json.dumps(sanitize_log(request))}")
```

---

## Crypto Trading Specific

### ❌ Disabling Trading Safety Checks

**Problem:** Financial loss from unhealthy system.

```python
# WRONG: Skip confirmations
def start_trading():
    engine.start()  # No YES confirmation

# WRONG: Bypass safety checks
git commit --no-verify  # When trading system is unhealthy
```

**Correct:**

```python
# RIGHT: Explicit confirmation
confirmation = input("Type 'YES' to start live trading: ")
if confirmation != "YES":
    return

# RIGHT: Fix system health before committing
python check_status.py  # Verify system is healthy
# ... fix issues ...
git commit  # Safety checks pass
```

**Reference:** `.claude/patterns/projects/crypto-trading.md`

---

### ❌ Scaling Capital Without Validation

**Problem:** Risking money on unproven strategy.

```python
# WRONG: Immediate capital increase
MAX_POSITION_SIZE = 1000  # From $10 to $1000 (dangerous!)
```

**Correct:**

```python
# RIGHT: 30-day validation first
python performance_monitor.py monthly

# Check metrics:
# - Min 50 trades
# - Win rate ≥52%
# - Positive expectancy
# - Max drawdown <30%

# ONLY THEN scale capital gradually
MAX_POSITION_SIZE = 20  # $10 → $20 (conservative increase)
```

---

## Capacitor Mobile

### ❌ Using Tailwind CSS CDN

**Problem:** Android WebView incompatible with Tailwind v4 CDN.

```html
<!-- WRONG: CDN for Tailwind (breaks on Android) -->
<script src="https://cdn.tailwindcss.com"></script>
```

**Correct:**

```bash
# RIGHT: Tailwind v3 via npm
pnpm add -D tailwindcss@3.4.18
```

**Reference:** `C:\dev\CLAUDE.md` (line 168)

---

### ❌ Relying on Automatic fetch() Patching

**Problem:** fetch() doesn't work on Android without explicit patching.

```typescript
// WRONG: Assume fetch() works
const response = await fetch('https://api.example.com');
```

**Correct:**

```typescript
// RIGHT: Use CapacitorHttp explicitly
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.request({
  url: 'https://api.example.com',
  method: 'GET',
});
```

**Reference:** `C:\dev\CLAUDE.md` (line 169)

---

## Related Patterns

- **Database Storage** - `.claude/patterns/core/database-storage.md`
- **Monorepo Workflow** - `.claude/patterns/core/monorepo-workflow.md`
- **Crypto Trading** - `.claude/patterns/projects/crypto-trading.md`
- **Nx Commands** - `.claude/patterns/core/nx-commands.md`

## Prevention Strategy

### Pre-commit Hooks

Most anti-patterns are caught by pre-commit hooks:

- Security scan (detects hardcoded secrets)
- Linting (catches code style issues)
- File size check (blocks 500+ line files)
- Trading system safety (blocks commits when unhealthy)

**Don't bypass hooks without good reason.**

### Code Review Checklist

Before approving PRs:

- [ ] No hardcoded paths (C:\, D:\)
- [ ] No sensitive data in code
- [ ] Files under 500 lines
- [ ] Tests included for new features
- [ ] Conventional commit messages
- [ ] Nx affected used in CI
- [ ] Documentation updated

### Learning from Mistakes

Document new anti-patterns when found:

1. Add to this file with clear example
2. Update pre-commit hook to prevent it
3. Add test case if applicable
4. Share with team/future self

---

## Success Stories

### Before: Long-lived branches

- `fix/4` branch: 147 merge conflicts
- Resolution time: 4+ hours
- Developer frustration: High

### After: Incremental merges

- Merge every 10 commits
- Conflicts per merge: 2-5
- Resolution time: 5-15 minutes
- Developer happiness: High

---

## References

- **All Patterns:** `.claude/patterns/`
- **Workspace Guide:** `C:\dev\CLAUDE.md`
- **Path Policy:** `C:\dev\docs\PATHS_POLICY.md`
- **Validation Script:** `C:\dev\check-vibe-paths.ps1`
