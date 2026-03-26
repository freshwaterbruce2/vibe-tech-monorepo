# pnpm Best Practices

Priority: MANDATORY
Package manager: pnpm with isolated mode (`node-linker=isolated`)
Store: `D:\pnpm-store`

## CRITICAL: Always Use --filter for Single Projects

```powershell
# CORRECT
pnpm install --filter <project>
pnpm add <package> --filter <project>
pnpm add -D <package> --filter <project>
pnpm remove <package> --filter <project>
pnpm update <package> --filter <project>
pnpm --filter <project> dev
pnpm --filter <project> build
pnpm --filter <project> test

# WRONG — triggers full monorepo install
cd apps/vibe-tutor && pnpm install
```

Never run bare `pnpm install` from inside a project directory.

## Nx Integration (preferred for build/test)

```powershell
pnpm nx dev <project>
pnpm nx build <project>
pnpm nx test <project>
pnpm nx affected:build       # Only changed projects
pnpm nx affected:test
```

Nx handles dependency graph automatically — use it for build/test operations when possible.

## Workspace References

In `package.json`, reference internal packages with:
```json
{ "dependencies": { "@vibetech/shared": "workspace:*" } }
```
