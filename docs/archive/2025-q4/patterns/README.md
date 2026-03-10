# Local Knowledge Management System

**Created:** 2025-12-29
**Purpose:** Document institutional knowledge, coding patterns, and best practices for the VibeTech monorepo

## Directory Structure

```
.claude/patterns/
├── README.md (this file)
├── core/                       # Core workspace patterns
│   ├── database-storage.md
│   ├── monorepo-workflow.md
│   ├── nx-commands.md
│   └── path-policy.md
├── projects/                   # Project-specific patterns
│   ├── crypto-trading.md
│   ├── capacitor-mobile.md
│   ├── web-applications.md
│   └── desktop-apps.md
└── ../anti-patterns/           # Things to avoid
    ├── common-mistakes.md
    ├── security-issues.md
    └── performance-pitfalls.md
```

## Usage

### Adding New Patterns

1. **Identify the pattern category:**
   - Core patterns: Workspace-wide rules and conventions
   - Project patterns: Technology-specific best practices
   - Anti-patterns: Common mistakes to avoid

2. **Document the pattern:**

   ```markdown
   ## Pattern Name

   **Category:** [Core/Project/Anti-pattern]
   **Tags:** #tag1 #tag2 #tag3

   ### Problem
   What problem does this solve?

   ### Solution
   How do we solve it?

   ### Example
   ```language
   // Code example
   ```

   ### Related Patterns

   - Link to related patterns

   ```

3. **Add to search index** (coming soon)

### Searching Patterns

```bash
# Using grep to search all patterns
grep -r "database" .claude/patterns/

# Using pattern search script (coming soon)
node scripts/search-patterns.mjs --query "nonce synchronization"
```

## Pattern Categories

### Core Patterns

- **Database Storage** - D:\ storage policy, SQLite best practices
- **Monorepo Workflow** - Git aliases, merge strategy, Nx commands
- **Path Policy** - Official path structure, validation rules
- **File Size Limits** - 360 line maximum, component splitting

### Project Patterns

- **Crypto Trading** - Kraken API, WebSocket V2, nonce management, risk parameters
- **Capacitor Mobile** - Android builds, CapacitorHttp, Tailwind v3 requirements
- **Web Applications** - React 19, shadcn/ui, TanStack Query patterns
- **Desktop Apps** - Tauri-first approach, performance optimization

### Anti-Patterns

- **Deep Imports** - Avoid ../../../utils, use aliases
- **Hardcoded Paths** - Never hardcode C:\ or D:\ in code
- **Data in C:\dev** - All data must go to D:\ drives
- **Git Bypasses** - Never use --no-verify without review

## Integration with Greptile (Future)

When Greptile MCP is configured, these patterns will be:

1. Automatically indexed for AI code review
2. Searchable via `search_custom_context` tool
3. Applied during PR reviews
4. Suggested when similar code is detected

## Maintenance

- **Review Frequency:** Monthly
- **Last Updated:** 2025-12-29
- **Next Review:** 2026-01-29
- **Owner:** Development Team

## Related Documentation

- **Workspace CLAUDE.md:** `C:\dev\CLAUDE.md`
- **Path Policy:** `C:\dev\docs\PATHS_POLICY.md`
- **Monorepo Workflow:** `C:\dev\MONOREPO_WORKFLOW.md`
- **Validation Script:** `C:\dev\check-vibe-paths.ps1`
