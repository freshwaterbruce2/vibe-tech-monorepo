# React 19 Migration Status

**Last Updated:** 2026-01-18
**Scope:** vibe-code-studio, vibe-tutor, nova-agent
**Priority:** HIGH - Prevents confusion for AI agents and IDEs

---

## Current State

### ESLint Configuration

✅ **DONE:** Added `@typescript-eslint/consistent-type-imports` rule to prevent future violations

- Location: `apps/vibe-code-studio/eslint.config.mjs`
- Rule enforces: `import type { ... }` for type-only imports
- Benefit: New code will follow React 19 patterns

### Type Import Errors

✅ **FIXED:** Resolved 3 critical ESLint errors in `src/types/index.ts`

- Converted inline `import('./agent').AgentTask` to proper type imports
- All critical errors resolved - project now builds successfully

### Remaining Work

**vibe-code-studio (118 files need attention):**

1. **Unused React Imports:** 118 files with `import React from 'react'`
   - Not needed with React 19 new JSX transform
   - Safe to remove if no React.* namespace usage

2. **React.FC Pattern:** 30+ files using React.FC<Props>
   - Anti-pattern in React 19
   - Should be: `const Component = (props: Props) => {}`
   - Instead of: `const Component: React.FC<Props> = (props) => {}`

3. **React Namespace Types:** 20+ files using React.MouseEvent, etc.
   - Should import types directly: `import type { MouseEvent } from 'react'`
   - Instead of: relying on React namespace

---

## Migration Strategy

### Phase 1: Prevention (✅ COMPLETE)

- ESLint rule added
- Future code follows correct patterns
- Build errors fixed

### Phase 2: Systematic Fixes (🔄 IN PROGRESS)

**Progress:**

1. ✅ Automated ESLint fix attempted (found critical errors)
2. ✅ Fixed all inline import() type annotations (7 files):
   - src/components/Editor/types.ts
   - src/components/Editor/useEditorKeyboard.ts
   - src/components/Editor/useEditorState.ts
   - src/components/EnhancedAgentMode/types.ts
   - src/hooks/useEditorSetup.ts
   - src/services/ai/PromptBuilder.ts
   - src/components/Editor.tsx
3. 🔄 React.FC conversions (80 files discovered, estimated 30+)
4. ⏳ Test after each batch

**Errors Reduced:** 30 → 18 (remaining are React Compiler config issues)

**Command to run:**

```bash
cd apps/vibe-code-studio
pnpm lint --fix

cd apps/vibe-tutor
pnpm lint --fix

cd apps/nova-agent
pnpm lint --fix
```

**Manual Fixes Required:**

- React.FC conversions (cannot be auto-fixed)
- Verify no functional regressions after removal of unused imports

### Phase 3: Verification

```bash
# Run tests after fixes
pnpm nx test vibe-code-studio
pnpm nx test vibe-tutor
pnpm nx test nova-agent

# Check for any new issues
pnpm nx lint vibe-code-studio
```

---

## Files Requiring Manual Attention

### vibe-code-studio (30+ React.FC files)

Most critical files:

- src/components/AICodeEditor.tsx
- src/components/Editor.tsx
- src/components/CommandPalette.tsx
- src/components/Settings.tsx
- src/components/AgentMode/*.tsx
- src/components/AIChat/*.tsx

Full list documented in `.serena/memories/react-import-patterns-2026.md`

### vibe-tutor (15+ files)

- Check with Grep for React.FC pattern
- Apply same fixes as vibe-code-studio

### nova-agent (5+ files)

- Fewer files affected
- Follow same pattern

---

## Testing Checklist

After applying fixes to each project:

- [ ] Build succeeds: `pnpm nx build <project>`
- [ ] Lint passes: `pnpm nx lint <project>`
- [ ] Tests pass: `pnpm nx test <project>`
- [ ] No console errors in dev mode
- [ ] Hot reload works correctly
- [ ] No TypeScript errors

---

## Benefits of Completion

1. **Consistency:** All React code follows 2026 best practices
2. **Performance:** Smaller bundle size (no unused React imports)
3. **Developer Experience:** Clearer component signatures
4. **AI Tools:** No confusion from mixed patterns
5. **Maintainability:** Standard patterns across monorepo

---

## Next Steps

**Priority Order:**

1. ✅ ESLint configuration (DONE)
2. ✅ Critical build errors (DONE)
3. 🔄 Automated lint fixes (PENDING USER APPROVAL)
4. ⏳ Manual React.FC conversions (PENDING)
5. ⏳ Test suite verification (PENDING)

**Estimated Effort:**

- Automated fixes: ~10 minutes (run lint --fix)
- Manual React.FC fixes: ~2-3 hours (30+ files)
- Testing: ~30 minutes per project

---

*This memory tracks progress on React 19 migration to ensure consistency across the monorepo.*
