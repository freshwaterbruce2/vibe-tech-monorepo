# TypeScript Patterns & Anti-Patterns

Last Updated: 2026-01-11
Priority: MANDATORY
Scope: All TypeScript/React projects in monorepo

---

## React Import Patterns (React 19+)

### DO: Named Imports Only

```tsx
// CORRECT - Named imports from react
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

const Component = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState(0);
  return <div>{children}</div>;
};
```

### DON'T: Default React Import or Namespace

```tsx
// WRONG - Unused default import (React 19 doesn't need it for JSX)
import React from 'react';

// WRONG - React namespace for types
import React from 'react';
const Component: React.FC<Props> = () => {};
const handler = (e: React.MouseEvent) => {};
```

**Why:** React 17+ with new JSX transform doesn't require `import React` for JSX. The default import becomes unused, causing TS6133 errors.

---

## Component Declaration Patterns

### DO: Typed Props Function

```tsx
// CORRECT - Props typed directly on function parameters
interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button = ({ label, onClick }: ButtonProps) => {
  return <button onClick={onClick}>{label}</button>;
};
```

### DON'T: React.FC Pattern

```tsx
// WRONG - React.FC is an anti-pattern
const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
```

**Why React.FC is problematic:**

1. Implicit `children` prop (can cause bugs)
2. No support for generic components
3. Doesn't work with `defaultProps`
4. Less readable/more verbose
5. Requires `import React` which is unused

---

## Type Imports

### DO: Use `type` Keyword for Types

```tsx
// CORRECT - Explicit type imports
import { useState } from 'react';
import type { ReactNode, MouseEvent, FormEvent } from 'react';
import type { ComponentProps, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
```

### DON'T: Mix Value and Type Imports

```tsx
// WRONG - Imports types as values (larger bundle, unclear intent)
import { ReactNode, useState } from 'react';
```

---

## ForwardRef Pattern

### DO: Named Import of forwardRef

```tsx
// CORRECT
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { Ref } from 'react';

interface InputRef {
  focus: () => void;
}

const Input = forwardRef<InputRef, InputProps>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  return <input ref={inputRef} {...props} />;
});
```

### DON'T: React.forwardRef Namespace

```tsx
// WRONG - Uses React namespace
import React from 'react';

const Input = React.forwardRef<InputRef, InputProps>((props, ref) => {
  React.useImperativeHandle(ref, () => ({...}));
  return <input {...props} />;
});
```

---

## Event Handler Types

### DO: Named Type Imports

```tsx
import type { MouseEvent, ChangeEvent, FormEvent, KeyboardEvent } from 'react';

const handleClick = (e: MouseEvent<HTMLButtonElement>) => {};
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {};
const handleSubmit = (e: FormEvent<HTMLFormElement>) => {};
const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {};
```

### DON'T: React.\* Event Types

```tsx
// WRONG
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {};
```

---

## HTML Attribute Types

### DO: Named Type Imports

```tsx
import type {
  HTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ImgHTMLAttributes,
} from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}
```

---

## Module Exports

### DO: Export Types from Dedicated Files

```tsx
// hooks/dashboard/types.ts
export interface DashboardMetrics {
  totalLeads: number;
  conversionRate: string;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
}

export type ActivityStatus = 'success' | 'failed' | 'in-progress';
```

### DON'T: Forget to Export Used Types

```tsx
// WRONG - Type used by other files but not exported
interface DashboardMetrics { ... } // Missing 'export'
```

---

## ESLint Rules That Catch These

The workspace `eslint.config.js` includes:

```js
// Catches unused imports
'@typescript-eslint/no-unused-vars': 'error'

// Bans React.FC pattern
'@typescript-eslint/ban-types': ['error', {
  types: {
    'React.FC': { message: 'Use typed props instead' }
  }
}]
```

---

## Pre-Commit Enforcement

The `scripts/pre-commit.ps1` hook runs:

1. **ESLint** - Catches pattern violations
2. **TypeScript** - Catches type errors
3. **File size** - Blocks large files

Run manually: `powershell -File scripts/pre-commit.ps1`

---

## Quick Reference

| Pattern      | Correct                   | Wrong                       |
| ------------ | ------------------------- | --------------------------- |
| React import | `import { useState }`     | `import React`              |
| Component    | `({ prop }: Props) => {}` | `React.FC<Props>`           |
| Event type   | `MouseEvent<T>`           | `React.MouseEvent<T>`       |
| Ref          | `forwardRef<T>(...)`      | `React.forwardRef<T>(...)`  |
| Hook         | `useImperativeHandle`     | `React.useImperativeHandle` |

---

## Migration Commands

Fix existing codebase:

```bash
# Find React.FC usage
pnpm grep "React\.FC" --include="*.tsx"

# Find unused React imports
pnpm eslint "apps/**/*.tsx" --rule '@typescript-eslint/no-unused-vars: error'

# Auto-fix what's possible
pnpm eslint "apps/**/*.tsx" --fix
```

---

Enforcement: ESLint + Pre-commit hooks
**Violations:** Will block commits
