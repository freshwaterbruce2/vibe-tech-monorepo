# React Import Patterns - 2026 Standards

**Last Updated:** 2026-01-18
**Priority:** HIGH - Affects code completion, ESLint errors, and TypeScript strict mode

## Issue Summary

**Scope:** 60+ files across vibe-code-studio, vibe-tutor, nova-agent
**Impact:** Unused imports cause TS6133 errors, confuse AI code completion tools, violate React 19 best practices

## Anti-Patterns Found

### 1. Unused Default React Import (30+ files)

```tsx
// ❌ WRONG - Unused with React 19 new JSX transform
import React from 'react';

// ✅ CORRECT - Named imports only
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
```

### 2. React.FC Pattern (30+ files)  

```tsx
// ❌ WRONG - Anti-pattern with implicit children, no generics support
const Component: React.FC<Props> = ({ prop }) => {};

// ✅ CORRECT - Typed props directly
const Component = ({ prop }: Props) => {};
```

### 3. React Namespace for Types (20+ files)

```tsx
// ❌ WRONG - Requires unused React import
const handleClick = (e: React.MouseEvent) => {};

// ✅ CORRECT - Named type import
import type { MouseEvent } from 'react';
const handleClick = (e: MouseEvent<HTMLButtonElement>) => {};
```

## ESLint Configuration Added

```javascript
// apps/vibe-code-studio/eslint.config.mjs
'@typescript-eslint/consistent-type-imports': ['error', {
  prefer: 'type-imports',
  fixStyle: 'separate-type-imports'
}],
'@typescript-eslint/ban-types': ['error', {
  types: {
    'React.FC': {
      message: 'Use typed props instead: ({ prop }: Props) => JSX.Element'
    }
  }
}]
```

## Affected Files by Project

### vibe-code-studio (40+ files)

- `src/components/*.tsx` - Main UI components
- `src/pages/*.tsx` - Page components  
- `src/modules/editor/components/**/*.tsx` - Editor components
- `src/__tests__/**/*.tsx` - Test files

### vibe-tutor (15+ files)

- `components/features/*.tsx` - Feature components
- `components/dashboard/*.tsx` - Dashboard components
- `components/settings/*.tsx` - Settings components

### nova-agent (5+ files)

- `src/components/ui/__tests__/*.tsx` - UI test files

## Systematic Fix Approach

### Phase 1: Prevent Future Violations ✅

- Added ESLint rules to vibe-code-studio
- Rules will catch new violations during development

### Phase 2: Fix Existing Violations (Manual)

1. **Remove unused React imports**
   - Replace `import React from 'react';` with named imports
   - Keep `import { useState, useEffect } from 'react';`

2. **Convert React.FC to typed props**
   - Replace `const Comp: React.FC<Props> = (props) =>` 
   - With `const Comp = (props: Props) =>`

3. **Use named type imports**
   - Replace `React.MouseEvent` with `MouseEvent`
   - Add `import type { MouseEvent } from 'react';`

### Phase 3: Automated Linting

- Run `npm run lint -- --fix` to auto-fix what's possible
- Manual review for React.FC conversions (requires logic changes)

## Why This Matters (2026 Context)

1. **TypeScript Strict Mode**: Unused imports fail strict compilation
2. **AI Code Completion**: AI tools suggest outdated patterns
3. **React 19**: New JSX transform doesn't need React in scope
4. **ESLint Compliance**: Prevents CI/CD pipeline failures
5. **Code Quality**: Cleaner, more maintainable codebase

## Related Documentation

- `.claude/rules/typescript-patterns.md` - Comprehensive TypeScript patterns guide
- React 19 migration guide: <https://react.dev/blog/2024/04/25/react-19-upgrade-guide>
- TypeScript 5.9 release notes: <https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/>

## Next Steps

1. Run `npm run lint` in vibe-code-studio to see all violations
2. Systematically fix high-impact files first (Editor, AIChat, main components)
3. Run tests after each batch of fixes
4. Apply same ESLint rules to vibe-tutor and nova-agent
5. Document fixes in commit messages
