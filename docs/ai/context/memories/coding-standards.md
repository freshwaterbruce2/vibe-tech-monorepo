# Coding Standards & Rules

Last Updated: 2026-01-07

## Non-Negotiable Rules

### File Size Limits

- **Target 500 lines +/- 100 per file**
- Prefer modular structure with focused, single-responsibility components
- If a file exceeds 600 lines, proactively split it
- Enforcement: `node scripts/check-line-limits.mjs --max 600`

### Platform Requirements

- **OS**: Windows 11 ONLY (no cross-platform)
- **Shell**: PowerShell 7+ (NOT bash)
- **File System**: NTFS (C:\ for code, D:\ for data)
- **Line Endings**: CRLF (\r\n) - configured in .gitattributes

### Package Manager

- **ALWAYS use pnpm** (NEVER npm or yarn)
- pnpm 9.15.0 - 59.5% disk space savings via hard links
- Commands: `pnpm install`, `pnpm nx run-many`, `pnpm add <pkg> --filter <project>`

## Modular Architecture Pattern

Every complex feature should follow this structure:

```
feature/
  index.ts           # Main export (barrel file)
  FeatureMain.tsx    # Orchestration component (<200 lines)
  FeatureForm.tsx    # Form sub-component
  FeatureList.tsx    # List sub-component
  useFeature.ts      # Custom hook for state/logic
  types.ts           # TypeScript interfaces
  utils.ts           # Helper functions
```

## Hook Extraction Pattern (Proven)

When a component grows too large, extract state + logic into hooks:

### State Hooks (useCaseState pattern)

- Group related state together
- Include localStorage/persistence in the hook
- Export both state AND setters for flexibility
- Include CRUD handlers (add, update, delete)

### API Hooks (useApiHandlers pattern)

- One hook per API domain (chat, analysis, evidence)
- Return loading states, data, and handler functions
- Handle errors via callback pattern

### Context Builders (useCaseContext pattern)

- Extract complex string building logic
- Use useCallback for memoization
- Keep pure - no side effects

## TypeScript Conventions (2026)

### Nullish Coalescing

```typescript
// ✅ Correct
const value = data?.field ?? defaultValue;

// ❌ Avoid
const value = data?.field || defaultValue; // Loses falsy values
```

### Promise Handling

```typescript
// ✅ Correct - explicit void for fire-and-forget
useEffect(() => {
  void fetchData();
  const id = setInterval(() => void fetchData(), 30000);
  return () => clearInterval(id);
}, [fetchData]);

// ❌ Avoid - unhandled promise
useEffect(() => {
  fetchData(); // ESLint error: floating promise
}, []);
```

### Sets for Lookup Arrays

```typescript
// ✅ Correct - O(1) lookup
const CLAIMANT_ROLES = new Set(['claimant', 'plaintiff', 'employee'])
if (CLAIMANT_ROLES.has(role)) { ... }

// ❌ Avoid - O(n) lookup
const claimantRoles = ['claimant', 'plaintiff', 'employee']
if (claimantRoles.includes(role)) { ... }
```

### Readonly Props

```typescript
interface Props {
  readonly data: DataType[];
  readonly onUpdate: (id: string) => void;
}
```

## Import Organization

1. React imports
2. Third-party libraries
3. Local hooks
4. Local components
5. Types (use `import type` for type-only imports)

## Lazy Loading Pattern (React 19)

For large tab-based applications:

```typescript
// LazyTabs.tsx - centralize all lazy imports
import { lazy, Suspense, ComponentType } from 'react'

function TabLoading() {
  return <div className="animate-spin">Loading...</div>
}

function withSuspense<P extends object>(LazyComponent: ComponentType<P>): ComponentType<P> {
  return (props: P) => (
    <Suspense fallback={<TabLoading />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

export const LazyFeatureTab = withSuspense(
  lazy(() => import('./tabs/FeatureTab').then(m => ({ default: m.FeatureTab })))
)
```

**Benefits**: 46% reduction in initial bundle, tabs load on-demand

## Undo System Pattern

For auto-populated data with undo support:

```typescript
const snapshotRef = useRef<StateSnapshot | null>(null);

const undoLastAction = useCallback(() => {
  if (!snapshotRef.current) return;
  setState(snapshotRef.current);
  snapshotRef.current = null;
}, [setState]);

// Before auto-populating
snapshotRef.current = { ...currentState };
// Make changes...
onComplete?.(populated, undoLastAction); // Pass undo fn to toast
```

## Vite Chunk Optimization (2026)

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules/react')) return 'vendor-react'
        if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
        if (id.includes('/src/hooks/')) return 'app-hooks'
        if (id.includes('/components/tabs/')) return 'app-tabs'
      }
    }
  }
}
```

## Nx Integration (2026)

- Use Nx commands for all tasks: `pnpm nx run-many -t lint,test,build`
- Leverage Nx caching: 80-90% faster builds
- Run affected only: `pnpm nx affected:build`
- Visualize dependencies: `pnpm nx graph`

## Pre-commit Checklist

- [ ] All files under 600 lines
- [ ] No `||` for defaults (use `??`)
- [ ] Promises handled with `void` or `.catch()`
- [ ] Props marked `readonly`
- [ ] Lookup arrays as Sets
- [ ] TypeScript strict mode passes
- [ ] Lazy loading for large components
- [ ] Bundle size optimized
- [ ] ESLint + Prettier clean
- [ ] Tests passing

## Reference

See `.claude/rules/` for detailed guidelines
