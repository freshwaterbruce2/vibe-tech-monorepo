# VibeTech Monorepo Style Guide (2026)

## MANDATORY RULES

Read `.claude/rules/` for complete guidelines:
- `typescript-patterns.md` - React 19 + TypeScript 5.9
- `no-duplicates.md` - Anti-duplication (CRITICAL)
- `paths-policy.md` - C:\ vs D:\ storage
- `database-storage.md` - D:\ database placement
- `platform-requirements.md` - Windows 11 only
- `version-control.md` - GitHub

## React 19 + TypeScript 5.9

### Correct Pattern
```typescript
// ✅ CORRECT: Named imports, typed props
import { useState, useEffect, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const Component = ({ children }: Props) => {
  const [state, setState] = useState(0);
  return <div>{children}</div>;
};
```

### Wrong Patterns
```typescript
// ❌ WRONG: Default React import (unused)
import React from 'react';

// ❌ WRONG: React.FC pattern
const Component: React.FC<Props> = ({ children }) => {};

// ❌ WRONG: React namespace for types
const handler = (e: React.MouseEvent) => {};
```

## Storage Rules

**CRITICAL: Data NEVER goes in C:\dev**

- **Code**: `C:\dev\` - All source code
- **Databases**: `D:\databases\` - NEVER in C:\dev
- **Logs**: `D:\logs\` - NEVER in C:\dev
- **Data**: `D:\learning-system\`, `D:\data\` - NEVER in C:\dev

### Example Database Path
```typescript
// ✅ CORRECT
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';

// ❌ WRONG
const DB_PATH = './data/app.db';  // DON'T put in C:\dev
```

## Package Manager

**ALWAYS pnpm, NEVER npm or yarn**

```bash
# ✅ CORRECT
pnpm add <package>
pnpm add <package> --filter <app>
pnpm run quality
pnpm nx graph

# ❌ WRONG
npm install <package>
yarn add <package>
```

## Version Control

**Platform**: GitHub (github.com)
**Repository**: https://github.com/freshwaterbruce2/Monorepo.git

## Tech Stack (February 2026)

| Technology | Version |
|------------|---------|
| React | 19.2.3 |
| TypeScript | 5.9.3 |
| Vite | 7.1.9 |
| Node.js | 22.x |
| pnpm | 10.28.1 |
| Nx | 22.3.3 |

## File Organization

```
C:\dev\
├── apps\              # Applications (52+ projects)
├── packages\          # Shared libraries
├── backend\           # Backend services
├── .vscode\           # VS Code settings
├── .gemini\           # Gemini CLI settings
└── .claude\           # Claude Code rules

D:\
├── databases\         # All SQLite databases
├── logs\              # All application logs
├── learning-system\   # AI learning data
└── data\              # Other data files
```

## Anti-Duplication Workflow

**BEFORE creating ANY file:**

1. **Search** existing codebase for similar implementations
2. **Document** all duplicates found with file paths
3. **Propose** refactoring to consolidate logic
4. **Implement** reusable abstractions
5. **Delete** redundant code after migration

## Code Quality Standards

### Import Organization
```typescript
// 1. External dependencies
import { useState, useEffect } from 'react';

// 2. Type imports
import type { ReactNode, MouseEvent } from 'react';

// 3. Internal modules
import { Button } from '@/components/ui/button';

// 4. Relative imports
import { utils } from './utils';
```

### Component Structure
```typescript
// 1. Props interface
interface ComponentProps {
  title: string;
  onAction: () => void;
}

// 2. Component function
const Component = ({ title, onAction }: ComponentProps) => {
  // 3. State hooks
  const [state, setState] = useState(false);

  // 4. Effect hooks
  useEffect(() => {
    // effect logic
  }, []);

  // 5. Event handlers
  const handleClick = () => {
    onAction();
  };

  // 6. Render
  return <div onClick={handleClick}>{title}</div>;
};

// 7. Export
export { Component };
```

## Testing Requirements

- **Unit tests**: `*.test.tsx` (Vitest + React Testing Library)
- **E2E tests**: `*.spec.ts` (Playwright)
- **Coverage target**: 80%+

## Commit Convention

```bash
# Format: <type>: <description>
git commit -m "feat: add user authentication"
git commit -m "fix: resolve nonce synchronization"
git commit -m "refactor: consolidate duplicate handlers"
git commit -m "docs: update API documentation"
```

## Performance Guidelines

- **Bundle size**: Keep components <50KB
- **Lazy loading**: Components >50KB must be lazy-loaded
- **Memoization**: Use `useMemo` for expensive calculations
- **Virtual scrolling**: Lists >100 items must use virtualization

## Security Rules

**NEVER commit**:
- API keys, tokens, secrets
- `.env` files
- Database files
- Log files
- `**/*.key`, `**/*.pem`

**ALWAYS**:
- Use environment variables for secrets
- Validate user input
- Sanitize database queries
- Use HTTPS for API calls

## Nx Monorepo Commands

```bash
# Build all projects
pnpm nx run-many -t build

# Build affected only
pnpm nx affected -t build

# Test all projects
pnpm nx run-many -t test

# View dependency graph
pnpm nx graph
```

## Python (Crypto Trading System)

```python
# Virtual environment
.venv\Scripts\activate

# Dependencies
pip install -r requirements.txt

# Database path (ALWAYS D:\)
DB_PATH = Path(os.getenv('DATABASE_PATH', r'D:\databases\trading.db'))
```

## Additional Resources

- **Full Documentation**: See `.claude/rules/` directory
- **Main Guidelines**: `CLAUDE.md` in repository root
- **Workflow Guide**: `MONOREPO_WORKFLOW.md`
- **Path Policy**: `.claude/rules/paths-policy.md`
