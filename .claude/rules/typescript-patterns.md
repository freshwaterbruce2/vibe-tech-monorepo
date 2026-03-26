# TypeScript Patterns & Anti-Patterns

Priority: MANDATORY — violations block commits (ESLint + pre-commit hooks).

## Quick Reference

| Pattern | Correct | Wrong |
|---------|---------|-------|
| React import | `import { useState }` | `import React` |
| Component | `({ prop }: Props) => {}` | `React.FC<Props>` |
| Type import | `import type { ReactNode }` | `import { ReactNode }` (value import) |
| Event type | `MouseEvent<T>` | `React.MouseEvent<T>` |
| Ref | `forwardRef<T>(...)` | `React.forwardRef<T>(...)` |
| Hook | `useImperativeHandle` | `React.useImperativeHandle` |

## Rules

**Never use `import React from 'react'`** — React 17+ JSX transform doesn't need it; causes TS6133 unused import errors.

**Never use `React.FC<Props>`** — it adds implicit `children`, breaks generics, requires unused React import. Use typed props directly:
```tsx
// Correct
const Button = ({ label, onClick }: { label: string; onClick: () => void }) => { ... };
```

**Always use `import type` for types:**
```tsx
import { useState } from 'react';
import type { ReactNode, MouseEvent, HTMLAttributes } from 'react';
```

**Always export types used by other files** — missing `export` on an interface causes TS errors in consumers.

**Use named imports for hooks/utilities:**
```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react';
// not React.forwardRef, React.useImperativeHandle
```

## Auto-fix

```bash
pnpm eslint "apps/**/*.tsx" --fix
```
