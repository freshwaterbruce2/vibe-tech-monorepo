---
name: Monorepo Governance
description: This skill should be used when the user asks about "dependency policies", "project boundaries", "architectural constraints", "module boundaries", "import restrictions", "circular dependencies", "dependency rules", "project tags", "enforce-module-boundaries", or needs to define or enforce structural rules across the monorepo. Provides governance patterns for maintaining architectural integrity in large Nx workspaces.
version: 1.0.0
---

# Monorepo Governance

Architectural constraint enforcement, dependency policies, and project boundary rules for the VibeTech Nx monorepo. Ensures structural integrity as the workspace grows.

## Dependency Policy Framework

### Layered Architecture

Organize projects into layers with strict dependency direction:

```
┌─────────────────────────────┐
│         Applications        │  ← Can depend on everything below
│  (apps/nova-agent, etc.)    │
├─────────────────────────────┤
│       Feature Libraries     │  ← Can depend on shared only
│  (packages/feature-*)       │
├─────────────────────────────┤
│       Shared Libraries      │  ← Can depend on other shared only
│  (packages/shared-*)        │
├─────────────────────────────┤
│       Utility Libraries     │  ← Zero dependencies (leaf nodes)
│  (packages/utils, types)    │
└─────────────────────────────┘
```

Rules:
- Dependencies flow downward only
- No upward or lateral dependencies between layers
- Applications are the only layer that can depend on features
- Utility libraries must have zero internal dependencies

### Tag Assignment Strategy

Apply tags in each project's `project.json`:

```json
{
  "tags": ["scope:<scope>", "type:<type>", "platform:<platform>"]
}
```

**Scope tags** define domain ownership:
- `scope:app` - Deployable applications
- `scope:feature` - Domain-specific feature libraries
- `scope:shared` - Cross-cutting shared code
- `scope:infra` - Infrastructure and tooling

**Type tags** define architectural layer:
- `type:ui` - Visual components
- `type:data` - State, API clients, stores
- `type:util` - Pure functions, helpers
- `type:config` - Configuration and constants

**Platform tags** define deployment target:
- `platform:web` - Browser applications
- `platform:desktop` - Tauri/Electron apps
- `platform:mobile` - Capacitor/React Native
- `platform:node` - Server-side services

### Enforcement via ESLint

Configure `@nx/enforce-module-boundaries` in the root ESLint config:

```js
"@nx/enforce-module-boundaries": ["error", {
  "enforceBuildableLibDependency": true,
  "allow": [],
  "depConstraints": [
    { "sourceTag": "scope:app", "onlyDependOnLibsWithTags": ["scope:shared", "scope:feature"] },
    { "sourceTag": "scope:feature", "onlyDependOnLibsWithTags": ["scope:shared"] },
    { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
    { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:ui", "type:util"] },
    { "sourceTag": "type:data", "onlyDependOnLibsWithTags": ["type:data", "type:util"] }
  ]
}]
```

## Circular Dependency Prevention

### Detection

```bash
# Visual detection
pnpm nx graph

# Programmatic detection (affected analysis will fail on cycles)
pnpm nx affected -t build --verbose
```

### Prevention Strategies

1. **Extract shared interfaces** - When A depends on B and B depends on A, extract the shared contract into a new `shared-types` package
2. **Dependency inversion** - Use interfaces/abstract classes to invert the dependency direction
3. **Event-based decoupling** - Replace direct imports with event bus patterns for cross-cutting concerns
4. **Barrel file discipline** - Only export from `index.ts` what other packages actually need

### Resolution Pattern

When a circular dependency is detected:

1. Identify the cycle: `A → B → C → A`
2. Find the weakest link (least necessary dependency)
3. Extract shared types/interfaces into a new leaf package
4. Update imports to use the new shared package
5. Verify cycle is broken: `pnpm nx graph`

## Version Alignment Policy

### Workspace-Level Dependencies

Critical packages must be aligned across all projects:

| Package | Policy | Reason |
|---------|--------|--------|
| React | Single version | Runtime conflicts |
| TypeScript | Single version | Type compatibility |
| Vite | Single version | Build consistency |
| ESLint | Single version | Rule compatibility |
| Tailwind CSS | Single version | Style consistency |

### Enforcement

Use pnpm workspace protocol in `package.json`:

```json
{
  "dependencies": {
    "@vibetech/shared-utils": "workspace:*"
  }
}
```

Detect mismatches with the `/nx-toolkit:dep-sync` command.

## Project Boundary Rules

### Import Restrictions

1. **No deep imports** - Import from package entry point only (`@vibetech/shared-utils`, not `@vibetech/shared-utils/src/internal/helper`)
2. **No relative cross-project imports** - Never use `../../apps/other-app/src/...`
3. **No circular workspace references** - A cannot depend on B if B depends on A
4. **Platform isolation** - Desktop code cannot import mobile-specific modules

### File Organization Rules

Each project must follow:
- `src/` for source code
- `src/index.ts` as single entry point
- Types exported from dedicated `types.ts` or `types/` directory
- Internal modules not re-exported from index

## Governance Audit Workflow

To audit the workspace for governance violations:

1. Run module boundary check: `pnpm nx lint --all`
2. Check for circular deps: `pnpm nx graph` (visual inspection)
3. Check version alignment: `/nx-toolkit:dep-sync`
4. Review project tags: ensure all projects have scope + type tags
5. Check for orphaned projects: projects with no dependents and no tags

## Additional Resources

### Reference Files

For detailed governance patterns and policies:
- **`references/dependency-matrix.md`** - Complete dependency allowance matrix and tag taxonomy
- **`references/audit-scripts.md`** - Scripts for automated governance auditing
