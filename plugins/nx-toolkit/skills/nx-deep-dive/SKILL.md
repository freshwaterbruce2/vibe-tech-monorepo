---
name: Nx Deep Dive
description: This skill should be used when the user asks about "Nx performance tuning", "custom Nx executors", "Nx generators", "Nx migration", "Nx cache optimization", "task pipeline configuration", "project graph configuration", "named inputs", "Nx distributed execution", or needs advanced Nx workspace patterns beyond basic commands. Provides deep Nx expertise for complex monorepo optimization.
version: 1.0.0
---

# Nx Deep Dive

Advanced Nx monorepo patterns, performance optimization, and migration strategies for the VibeTech workspace running Nx 21.6.3+ with pnpm.

## Core Concepts

### Task Pipeline Architecture

Configure task dependencies for correct build ordering. Define in `nx.json` under `targetDefaults`:

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    }
  }
}
```

Key rules:
- `^build` means "run build on all dependencies first"
- `dependsOn` defines execution order
- `inputs` controls cache invalidation granularity
- Always set `cache: true` for deterministic targets

### Named Inputs for Cache Precision

Define reusable input sets to control what invalidates the cache:

```json
{
  "namedInputs": {
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/**/*.test.ts",
      "!{projectRoot}/test-setup.ts"
    ],
    "sourceOnly": [
      "{projectRoot}/src/**/*",
      "{projectRoot}/package.json",
      "{projectRoot}/tsconfig*.json"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/tsconfig.base.json",
      "{workspaceRoot}/nx.json"
    ]
  }
}
```

Optimization: exclude test files from `production` inputs so test changes don't invalidate build cache.

### Project Tags and Constraints

Enforce architectural boundaries using project tags in `project.json`:

```json
{
  "tags": ["scope:shared", "type:util"]
}
```

Configure enforcement in `.eslintrc.json` or `eslint.config.js`:

```js
{
  "@nx/enforce-module-boundaries": ["error", {
    "depConstraints": [
      { "sourceTag": "scope:app", "onlyDependOnLibsWithTags": ["scope:shared", "scope:app"] },
      { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
      { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:ui", "type:util"] }
    ]
  }]
}
```

## Performance Optimization

### Cache Strategy

1. **Local cache**: `.nx/cache/` directory, default 7-day retention
2. **Remote cache**: Nx Cloud for team sharing, configured via `nxCloudId`
3. **Cache inputs**: Fine-tune with named inputs to maximize hit rate

Check cache effectiveness:

```bash
pnpm nx show project <name> --web   # View project config
pnpm nx run-many -t build --verbose  # See cache hits in output
```

### Parallel Execution Tuning

Configure in `nx.json`:

```json
{
  "parallel": 3,
  "cacheDirectory": ".nx/cache"
}
```

Guidelines:
- Set `parallel` to CPU cores minus 1
- For memory-intensive tasks (TypeScript, Webpack), reduce to 2-3
- For lightweight tasks (lint, format), increase to 5+
- Override per-run: `pnpm nx run-many -t lint --parallel=8`

### Affected Command Optimization

Reduce CI time by running only what changed:

```bash
pnpm nx affected -t build --base=main --head=HEAD
pnpm nx affected -t test --base=main --head=HEAD --parallel=5
```

For local development, affected defaults to uncommitted changes.

## Migration Strategies

### Major Version Upgrades

Use the built-in migration system:

```bash
# Generate migration scripts
pnpm nx migrate @nx/workspace@latest

# Review generated migrations.json
cat migrations.json

# Run migrations
pnpm nx migrate --run-migrations

# Clean up
rm migrations.json
```

### Safe Migration Workflow

1. Create D:\ snapshot before migration
2. Run `nx migrate` to generate migration plan
3. Review `migrations.json` for breaking changes
4. Run migrations on a feature branch
5. Test affected projects: `pnpm nx affected -t test`
6. Run full quality check: `pnpm run quality`
7. Merge only after all checks pass

### Common Migration Issues

- **Plugin API changes**: Check `@nx/js`, `@nx/react` changelogs
- **Config format changes**: `nx.json` schema may evolve
- **Generator changes**: Project scaffolding templates may change
- **Cache invalidation**: Full cache clear needed after major upgrades

## Custom Generators

Create workspace-specific generators for consistent scaffolding:

```bash
# Generate a generator
pnpm nx generate @nx/plugin:generator my-generator --project=my-plugin
```

Generator structure:
```
generators/
├── my-generator/
│   ├── generator.ts       # Generator logic
│   ├── schema.json        # Input schema
│   ├── schema.d.ts        # TypeScript types
│   └── files/             # Template files
│       └── __name__/
│           └── index.ts.template
```

## Troubleshooting

### Cache Not Working

1. Verify `cache: true` in target defaults
2. Check `inputs` aren't too broad (include only needed files)
3. Run `pnpm nx reset` to clear corrupted cache
4. Verify `.nx/cache/` exists and is writable

### Slow Project Graph

1. Exclude `node_modules` from file watching
2. Use `@nx/js` plugin for source-file-based detection
3. Limit workspace scan with `workspaceLayout` config
4. Check for circular dependencies: `pnpm nx graph`

### "Project X was not found" Errors

1. Verify `project.json` exists in project root
2. Check `workspaceLayout` in `nx.json` matches actual paths
3. Run `pnpm nx show projects` to list detected projects
4. Ensure project name matches across configs

## Additional Resources

### Reference Files

For detailed configuration examples and patterns:
- **`references/advanced-config.md`** - Complete nx.json configuration reference with all options
- **`references/migration-checklist.md`** - Step-by-step migration checklist for major Nx version upgrades
