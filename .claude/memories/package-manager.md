# Package Manager

**Package Manager:** pnpm 10.28.1

## Critical Rules

1. **Always use pnpm** for dependency management in this monorepo
2. **Never use npm or yarn** (except for global tools)
3. **Use isolated mode** for project-specific operations

## Common Commands

```powershell
# Install dependencies for specific project
pnpm install --filter <project>

# Add package to specific project
pnpm add <package> --filter <project>

# Run scripts in specific project
pnpm --filter <project> <script>

# Nx commands (preferred for most operations)
pnpm nx <command> <project>
```

## Configuration

- **Store location:** `D:\pnpm-store`
- **Mode:** `isolated` (node-linker=isolated)
- **Recursive install:** disabled (prevents full monorepo installs)

## Related Documentation

- `.npmrc` - pnpm configuration
- `.claude/rules/pnpm-2026-best-practices.md` - Complete guide

**Last Updated:** 2026-02-21
