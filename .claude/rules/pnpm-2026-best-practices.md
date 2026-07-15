# pnpm Best Practices

Priority: MANDATORY
Package manager: pnpm with hoisted mode (`node-linker=hoisted`, `shamefully-hoist=true`)
Store: `D:\pnpm-store-v2`

Actual `.npmrc` at repo root:

```
shamefully-hoist=true
node-linker=hoisted
package-import-method=copy
public-hoist-pattern[]=*rollup*
public-hoist-pattern[]=@rollup/*
engine-strict=true
store-dir=D:\pnpm-store-v2
```

Hoisted layout is required for the Tauri + Electron + native-module apps in this workspace (Tauri's webview2-com, @electron/rebuild, and several AI SDKs resolve dependencies via direct sibling lookup, which isolated mode can break). Do not switch to isolated without a full workspace rebuild and per-app validation.

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

Never run bare `pnpm install` from inside a project directory. At repo root (`V:\monorepo`), `pnpm install` is the correct command for full workspace hydration.

## Dependency Catalog (single source of truth for versions)

Shared dependency versions live in the `catalog:` block of `pnpm-workspace.yaml`.
Manifests reference them with the `catalog:` specifier instead of a hardcoded
version — this eliminates version drift and makes an upgrade a **one-line edit**.

```jsonc
// apps/<any>/package.json
{ "devDependencies": { "typescript": "catalog:", "vitest": "catalog:" } }
```

```yaml
# pnpm-workspace.yaml
catalogMode: strict # `pnpm add <cataloged-dep>` must use the catalog version
catalog:
  typescript: 5.9.3
  vitest: ^4.1.9
  # react, react-dom, @types/react[-dom], vite, zod, tailwindcss, lucide-react,
  # better-sqlite3, @modelcontextprotocol/sdk, @vitest/*, tsx, autoprefixer,
  # @types/better-sqlite3
```

Rules:

- **Upgrade a cataloged dep:** edit its single line in `pnpm-workspace.yaml`, then
  `pnpm install` (or `pnpm update -r`). Never hardcode the version back into a
  manifest.
- **Add a new usage** of an already-cataloged dep: use `"<dep>": "catalog:"`.
  With `catalogMode: strict`, `pnpm add <dep>` enforces the catalog version.
- **Catalog vs `pnpm.overrides` are complementary — keep both.** The catalog
  unifies _direct_ dependency specifiers. `overrides` force a single _transitive_
  version (dedup) and apply security range pins. Removing a `react`/`typescript`/etc.
  override re-introduces duplicate transitive installs — verified, so those stay.
- **Guard:** `pnpm catalog:check` (`scripts/check-catalog-drift.mjs`) fails if any
  manifest hardcodes a version for a cataloged dep. Run it in CI / pre-commit.
- Requires pnpm >= 10.29 (fixes the circular `catalog:` write under strict mode);
  workspace is on 10.33.

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

## Stale bin shim recovery

If an app's `node_modules/.bin/` has orphan shims pointing to sibling folders that don't exist (symptom: `Cannot find module '...\node_modules\<pkg>\bin\<pkg>.js'` on build), the local shims are stale from a pre-hoisted install layout. Fix:

```powershell
# Identify broken shims (sibling folder missing)
cd <app-dir>\node_modules\.bin
Get-ChildItem -File | ForEach-Object {
  $name = $_.BaseName -replace '\.(cmd|ps1)$',''
  if (-not (Test-Path "..\$name")) { "BROKEN $($_.Name)" }
}

# Remove broken shims — PATH resolution falls through to root's working shims
Get-ChildItem <app-dir>\node_modules\.bin -File |
  Where-Object { -not (Test-Path "$(Split-Path $_.FullName -Parent)\..\$($_.BaseName -replace '\.(cmd|ps1)$','')") } |
  Remove-Item
```
