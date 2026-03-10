# Task 2.1: Merge Shared Packages

## ðŸ“‹ Task Details

| Field | Value |
|-------|-------|
| **ID** | ARCH-2.1 |
| **Phase** | 2 - Critical Consolidation |
| **Priority** | CRITICAL |
| **Estimated Duration** | 16 hours |
| **Risk Level** | HIGH |
| **Dependencies** | ARCH-1.2 |

## ðŸŽ¯ Objective

Merge `vibetech-shared` + `shared-utils` + `shared-logic` into new `@vibetech/core` package.

## ðŸ“ New Package Structure

```
packages/core/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ utils/          # From shared-utils
â”‚   â”œâ”€â”€ logic/          # From shared-logic
â”‚   â”œâ”€â”€ shared/         # From vibetech-shared
â”‚   â”œâ”€â”€ hooks/          # React hooks
â”‚   â””â”€â”€ index.ts
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig.json
â””â”€â”€ project.json
```

## ðŸ”§ Execution Steps

1. Create new `packages/core` directory
2. Copy and merge source files
3. Resolve naming conflicts
4. Update package.json with merged dependencies
5. Update all imports across monorepo
6. Test thoroughly

## âœ… Verification Checklist

- [ ] New package created
- [ ] All exports working
- [ ] No duplicate code
- [ ] All imports updated
- [ ] Tests passing
- [ ] Old packages deprecated

## ðŸŽ¯ Success Criteria

1. `@vibetech/core` fully functional
2. Zero breaking changes for consumers
3. Old packages marked deprecated
