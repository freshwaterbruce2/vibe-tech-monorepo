# Augment AI Coding Assistant Rules & Guidelines

Last Updated: 2026-01-12
Priority: RECOMMENDED
Scope: All development in VS Code with Augment enabled

---

## Overview

Augment is an AI coding assistant that provides context-aware code suggestions, completions, and answers based on your unique codebase. This guide covers best practices for using Augment effectively in the VibeTech monorepo.

**Official Documentation:**

- [Index your workspace](https://docs.augmentcode.com/setup-augment/workspace-indexing)
- [Rules & Guidelines](https://docs.augmentcode.com/setup-augment/guidelines)
- [Best Practices for AI Coding Agents](https://www.augmentcode.com/blog/best-practices-for-using-ai-coding-agents)

---

## Workspace Indexing

### What Gets Indexed

When you open a workspace with Augment enabled, your codebase is automatically uploaded to Augment's secure cloud. Augment indexes:

✅ **Included:**

- TypeScript/JavaScript source files (`.ts`, `.tsx`, `.js`)
- React components and hooks
- Configuration files (`package.json`, `tsconfig.json`, `nx.json`)
- Documentation (`.md` files)
- Python source files (`.py`)
- API endpoints and services

❌ **Excluded (via .augmentignore and .gitignore):**

- `node_modules/` directories
- Build outputs (`dist/`, `build/`, `.nx/`)
- Cache directories (`.cache/`, `.turbo/`, `.vite/`)
- Log files (`*.log`)
- Database files (`*.db`, `*.sqlite`)
- Test artifacts (`test-results/`, `playwright-report/`)
- Binary files (`.exe`, `.dll`, `.msi`)

### Indexing Performance

**Initial Indexing:**

- Typically takes <1 minute for well-configured workspaces
- Can take longer for large codebases (5-10 minutes)
- **Pro Tip:** Run initial indexing overnight or during lunch (machine works hard)

**Current Setup:**

- C:\dev: ~5,000-10,000 files indexed (with exclusions)
- D:\databases: Fully excluded (binary files only)
- D:\learning-system: Python/docs only (runtime data excluded)

---

## .augmentignore Configuration

### File Location

Create `.augmentignore` in the root of each workspace folder:

- `C:\dev\.augmentignore` ✅ (exists, comprehensive)
- `D:\databases\.augmentignore` ✅ (exists, excludes all)
- `D:\learning-system\.augmentignore` ✅ (exists, smart filtering)

### Pattern Syntax

Uses standard gitignore-style glob patterns:

```gitignore
# Exclude directories
node_modules/
dist/
.nx/

# Exclude file patterns
*.log
*.db
*.cache

# Exclude specific files
pnpm-lock.yaml
package-lock.json

# Include files from .gitignore (use ! prefix)
!node_modules/  # If you want dependencies indexed
```

### Performance Optimization

**Aggressive Exclusions (Recommended):**

```gitignore
# Dependencies (massive, low context value)
node_modules/
.pnpm-store/

# Build outputs (generated, not source)
dist/
build/
.next/
.nx/

# Test fixtures (not useful for context)
test-fixtures/
__mocks__/

# Git history (not needed)
.git/
```

**Why Exclude Aggressively:**

- Faster indexing (<1 min vs 10+ min)
- More accurate suggestions (focused on your code)
- Lower storage in Augment's cloud
- Better performance in IDE

---

## Best Practices for Using Augment Agent

### 1. Provide Rich Context

**Good:**

```
"Implement user authentication following the pattern in
apps/nova-agent/src/services/auth.ts. Use the same error
handling approach as ProfileService."
```

**Bad:**

```
"Add auth"
```

**Why:** Augment performs better when you reference specific files, patterns, or examples.

### 2. Specify Clear Details

**Good:**

```
"Enable JSON parser for chat backend. It should be used in
the 'LLMOutputParsing' class, somewhere in the 'services'
subfolder. Follow TypeScript strict mode."
```

**Bad:**

```
"Fix the parser"
```

**Why:** Specific keywords, file locations, and requirements prevent hallucinations.

### 3. Break Down Complex Tasks

**Good:**

```
Step 1: "Read the ticket BC-986 and summarize requirements"
Step 2: "Implement the settings menu component"
Step 3: "Write tests for SettingsMenu following existing patterns"
Step 4: "Update documentation in FEATURE_SPECS/"
```

**Bad:**

```
"Implement BC-986 with tests and docs"
```

**Why:** Sequential steps allow Augment to focus on one task at a time.

### 4. Reference Existing Code

**Good:**

```
"Check 'text_processor.py' for test organization examples,
then write tests for trading_engine.py"
```

**Bad:**

```
"Write tests"
```

**Why:** Providing examples ensures consistency with your codebase patterns.

---

## Monorepo-Specific Guidelines

### Cross-Service Context

**Advantage:** Augment handles 200k tokens, enough for substantial codebases to understand how subsystems interact.

**Best Practice:**

- Tag repositories by domain (`@billing`, `@auth`, `@infra`)
- Reference cross-project dependencies explicitly
- Use Nx project graph for context (`pnpm nx graph`)

### Workspace Structure

```
C:\dev (Main Monorepo)
├── apps/              # Applications (52 projects)
├── packages/          # Shared libraries
├── backend/           # API services
├── .augment/          # Augment rules and guidelines
│   ├── rules/         # Custom rules (Always, Manual, Auto)
│   └── guidelines.md  # Team conventions
└── .augmentignore     # Indexing exclusions
```

### Root Documentation

**Recommended:** Create `C:\dev\.augment-guidelines` (or `.augment/guidelines.md`) with:

- Monorepo structure overview
- Tech stack versions (React 19, TypeScript 5.9, pnpm 9.15)
- Coding standards (from CLAUDE.md)
- Testing philosophy
- Git workflow (incremental merge strategy)

---

## Rules & Guidelines System

### .augment/rules Directory

Augment supports custom rules written in natural language to improve Agent and Chat with your preferences.

**3 Rule Types:**

1. **Always Rules** - Included in every prompt

   ```markdown
   # .augment/rules/always-typescript-strict.md

   Always use TypeScript strict mode. Never use 'any' type.
   Prefer named imports over default imports for React.
   ```

2. **Manual Rules** - Tagged with `@` to attach

   ```markdown
   # .augment/rules/manual-security.md

   Tag: @security

   When implementing authentication:

   - Use bcrypt for password hashing
   - Implement rate limiting
   - Validate all user inputs
   ```

3. **Auto Rules** - Automatically detected based on description

   ```markdown
   # .augment/rules/auto-react-patterns.md

   Description: React component patterns
   Triggers: When working with .tsx files

   - Use typed props instead of React.FC
   - Prefer named exports over default
   - Use type imports for React types
   ```

### Example Rules for VibeTech Monorepo

**Create these files:**

```bash
# Always rules
.augment/rules/always-monorepo-standards.md
.augment/rules/always-no-duplicates.md
.augment/rules/always-path-policy.md

# Manual rules
.augment/rules/manual-crypto-trading.md (tag: @crypto)
.augment/rules/manual-mobile-capacitor.md (tag: @mobile)
.augment/rules/manual-desktop-tauri.md (tag: @desktop)

# Auto rules
.augment/rules/auto-react-19-patterns.md (triggers: .tsx files)
.augment/rules/auto-python-trading.md (triggers: .py in crypto-enhanced)
```

---

## Security & Privacy

### Data Storage

- Code stored securely in Augment's cloud
- Proof-of-possession API ensures code privacy
- Strict internal data minimization principles

### Excluded by Default

- `.env` files (secrets)
- `*.key`, `*.pem` files (credentials)
- `D:\databases/` (sensitive data)
- `.git/` history (not needed)

### Team Collaboration

- Share `.augmentignore` via Git (everyone uses same exclusions)
- Share `.augment/rules/` via Git (team conventions)
- **Don't commit:** `.augment/local-settings.json` (personal preferences)

---

## Performance Optimization Checklist

- [ ] `.augmentignore` excludes `node_modules/`, `.nx/`, `dist/`
- [ ] `.augmentignore` excludes `*.log`, `*.db`, binary files
- [ ] Initial indexing completed (<1 min for C:\dev)
- [ ] D:\ data folders excluded from workspace or fully ignored
- [ ] Workspace limited to code directories (not entire home folder)
- [ ] VS Code workspace configured with specific folders
- [ ] Augment Context Engine shows <10,000 files indexed

---

## Troubleshooting

### Issue: Slow Indexing (>5 minutes)

**Solution:**

1. Check `.augmentignore` is excluding large directories
2. Remove `node_modules/` from indexing
3. Exclude build artifacts and caches
4. Run `Get-ChildItem C:\dev -Recurse | Measure-Object` to check file count

### Issue: Inaccurate Suggestions

**Solution:**

1. Provide more context in prompts (reference specific files)
2. Use `.augment/rules/` to define coding standards
3. Break complex tasks into smaller steps
4. Reference existing code examples

### Issue: Privacy Concerns

**Solution:**

1. Verify `.env`, `*.key`, `secrets/` are in `.augmentignore`
2. Check `D:\databases/` is excluded
3. Review indexed files in Workspace Context panel
4. Use `.augmentignore` to exclude sensitive directories

### Issue: Workspace Not Indexing

**Solution:**

1. Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")
2. Check Augment extension is enabled
3. Verify workspace has valid `.augmentignore`
4. Ensure not running from home directory (safety guard)

---

## Integration with VibeTech Monorepo

### Current Configuration

**VS Code Workspace:** `C:\dev\dev.code-workspace`

```json
{
  "folders": [
    { "path": "." }, // C:\dev (main code)
    { "path": "D:/databases" }, // Excluded via .augmentignore
    { "path": "D:/learning-system" } // Python/docs only
  ]
}
```

**Exclusions:** See `C:\dev\.augmentignore` (196 lines, comprehensive)

### Recommended Workflow

1. **Start Augment Agent:**
   - `Ctrl+Shift+P` → "Augment: Start Agent"
   - Or use inline chat (`Ctrl+K`)

2. **Provide Context:**
   - Reference specific files: `"Follow pattern in apps/nova-agent/src/App.tsx"`
   - Tag rules: `@security @mobile` for mobile auth implementation
   - Reference tickets: `"Implement BC-986 following requirements"`

3. **Iterate:**
   - Review suggestions before accepting
   - Break complex tasks into steps
   - Reference existing code for consistency

4. **Verify:**
   - Run quality checks: `pnpm run quality`
   - Run tests: `pnpm run test`
   - Check for regressions

---

## 2026 Updates & Trends

### Recent Changes (January 2026)

- Indexing enabled by default in print mode
- Safety guard: disables indexing when running from home directory
- MCP integration support (45% of companies planning implementation by 2027)
- Enhanced context window (200k tokens for cross-service understanding)

### Industry Adoption

- 75% of API gateway vendors expected to offer MCP features by 2026
- Monorepos increasingly favored with AI tools (better cross-service context)
- Early adoption provides competitive advantages in developer productivity

---

## Related Documentation

### VibeTech Monorepo

- `.claude/rules/no-duplicates.md` - Anti-duplication workflow
- `.claude/rules/paths-policy.md` - C:\ vs D:\ storage rules
- `.claude/rules/typescript-patterns.md` - React 19 patterns
- `CLAUDE.md` - Main monorepo guidelines

### External Resources

- [Augment Code Official Docs](https://docs.augmentcode.com)
- [Best Practices for AI Coding Agents](https://www.augmentcode.com/blog/best-practices-for-using-ai-coding-agents)
- [AI Coding Assistants for Large Codebases](https://www.augmentcode.com/tools/ai-coding-assistants-for-large-codebases-a-complete-guide)
- [Monorepo vs Multi-Repo AI](https://www.augmentcode.com/tools/monorepo-vs-multi-repo-ai-architecture-based-ai-tool-selection)

---

## Sources

This guide was compiled from official Augment documentation and industry best practices as of January 2026:

- [Index your workspace - Augment](https://docs.augmentcode.com/setup-augment/workspace-indexing)
- [Rules & Guidelines for Agent and Chat - Augment](https://docs.augmentcode.com/setup-augment/guidelines)
- [Best practices for using AI coding Agents](https://www.augmentcode.com/blog/best-practices-for-using-ai-coding-agents)
- [AI Coding Assistants for Large Codebases: A Complete Guide](https://www.augmentcode.com/tools/ai-coding-assistants-for-large-codebases-a-complete-guide)
- [Monorepo vs Multi-Repo AI: Architecture-based AI Tool Selection](https://www.augmentcode.com/tools/monorepo-vs-multi-repo-ai-architecture-based-ai-tool-selection)
- [MCP Integration: Streamlining Multi-Repo Development](https://www.augmentcode.com/guides/mcp-integration-streamlining-multi-repo-development)

---

**Next Steps:**

1. Create `.augment/rules/` directory with custom rules
2. Create `.augment-guidelines` or `.augment/guidelines.md`
3. Review indexed files in Augment Workspace Context panel
4. Test Augment Agent with specific prompts referencing your codebase

---

_Last Updated_: January 12, 2026
_Status_: ACTIVE
_Enforcement_: RECOMMENDED (improves AI assistance quality)
