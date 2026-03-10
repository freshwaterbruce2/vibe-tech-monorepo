# Monorepo Shared Packages Guide

## Executive Summary

Explored C:\dev\packages directory structure and existing shared packages to understand patterns for creating new packages under packages/feature-flags/. Comprehensive findings document the current conventions, patterns, and best practices.

---

## 1. Package Directory Structure & Registry

### Existing Packages (14 total)

- **db-app** - Database utilities
- **db-learning** - Learning system persistence
- **feature-flags** - Feature flag system (monorepo with nested packages)
- **logger** - Structured JSON logging
- **nova-core** - NOVA Agent business logic
- **nova-database** - NOVA database layer
- **nova-types** - NOVA type definitions  
- **service-common** - Microservice utilities
- **shared-config** - Environment configuration
- **shared-ipc** - IPC message schemas
- **shared-utils** - General utilities
- **ui** - React UI components
- **vibetech-hooks** - React hooks library
- **vibetech-shared** - Shared components
- **vibetech-types** - Type definitions

### Workspace Registration (pnpm-workspace.yaml)

```yaml
packages:
  - "packages/*"
  - "packages/feature-flags/*"  # Special handling for nested packages
```

---

## 2. Naming Conventions

### Scoped Organization

**@nova/** → NOVA Agent System

- @nova/types (type definitions)
- @nova/core (business logic)
- @nova/database (persistence)

**@vibetech/** → VibeTech Platform

- @vibetech/shared (shared components)
- @vibetech/shared-utils (utilities)
- @vibetech/shared-config (environment config)
- @vibetech/hooks (React hooks)
- @vibetech/types (type definitions)
- @vibetech/ui (UI components)
- @vibetech/logger (logging)

**@dev/** → Development/Internal Tools

- @dev/feature-flags (feature flag system)
- @dev/feature-flags-core (core types/utils)
- @dev/service-common (service utilities)

### Naming Pattern

- **Scope**: @nova, @vibetech, @dev (indicates domain/owner)
- **Package name**: kebab-case, descriptive, singular/collective nouns
- Avoid generic names; prefer specific domain names

---

## 3. Package.json Patterns

### Pattern A: Types/Utilities Package (TypeScript Compiler)

```json
{
  "name": "@vibetech/types",
  "version": "1.0.0",
  "description": "Shared TypeScript type definitions for VibeTech monorepo projects",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./tasks": {
      "import": "./dist/tasks.js",
      "types": "./dist/tasks.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  },
  "files": ["dist"],
  "keywords": ["typescript", "types", "monorepo", "shared"],
  "author": "VibeTech",
  "license": "MIT"
}
```

### Pattern B: Library with Dual Build (tsup)

```json
{
  "name": "@dev/feature-flags-core",
  "version": "0.1.0",
  "description": "Core types and utilities for feature flags system",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "murmurhash": "^2.0.1"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Pattern C: React/UI Components

```json
{
  "name": "@vibetech/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts"
  },
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.2",
    "class-variance-authority": "^0.7.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "typescript": "^5.5.3"
  }
}
```

### Pattern Key Points

- **type**: "module" for ESM packages
- **exports**: Conditional exports for dual build support (import/require/types)
- **files**: Include only dist/ directory in npm package
- **scripts**: Always include build, typecheck, clean
- **peerDependencies**: For React/framework packages
- **workspace:*** protocol: Internal monorepo dependencies

---

## 4. TypeScript Configuration Patterns

### Pattern A: Standard Library

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Pattern B: Advanced (Source Maps + DOM)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "ws"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Standard Choices

- **target**: ES2022 (modern browsers + Node 16+)
- **module**: ES2022 or ESNext (most packages)
- **moduleResolution**: bundler or node
- **declaration**: true (always generate .d.ts files)
- **declarationMap**: true (source map for types)
- **strict**: true (strict type checking)

---

## 5. Export Patterns

### Pattern: Core Re-exports

```typescript
// src/index.ts
export * from './types';
export * from './hash';
export type {
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
} from './types';
```

### Pattern: Organized Selective Exports

```typescript
// src/index.ts
export * from './schemas.js';      // Zod schemas
export * from './validators.js';   // Validation functions
export * from './helpers.js';      // Helper utilities
export * from './queue.js';        // Queue implementation
export * from './offline-handler.js'; // Offline support
```

### Subpath Exports (package.json)

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./activity": {
    "import": "./dist/activity.js"
  },
  "./context": {
    "import": "./dist/context.js"
  },
  "./components/*": "./src/components/*.tsx",
  "./lib/*": "./src/lib/*.ts"
}
```

**Best Practice:** Use subpath exports to organize large packages and enable tree-shaking.

---

## 6. Build Tools & Scripts

### Primary Build Tools

**tsc (TypeScript Compiler)** - Most Common

- Simple, fast, handles declaration maps
- Use for type-focused packages
- No external bundling needed

**tsup** - For Libraries Needing Dual Builds

- Supports CJS + ESM simultaneously
- Handles code bundling and optimization
- Use when dual format support required

### Standard Script Set

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rimraf dist"
  }
}
```

---

## 7. Dependency Management

### Workspace Internal Dependencies

```json
{
  "dependencies": {
    "@nova/types": "workspace:*",
    "@nova/database": "workspace:*",
    "@vibetech/shared-config": "workspace:*"
  }
}
```

### External Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "zod": "^3.23.0",
    "uuid": "^11.0.0",
    "dotenv": "^16.4.5"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

### Key Guidelines

- Use **workspace:*** for internal packages
- Pin transitive dependency versions
- React/UI packages should use peerDependencies
- Minimize dependencies; reuse existing packages

---

## 8. Directory Structure

### Standard Package Layout (Single)

```
packages/shared-utils/
├── src/
│   ├── index.ts
│   └── security/
│       └── SecureApiKeyManager.ts
├── dist/                        # Generated by build
├── package.json
├── tsconfig.json
└── README.md
```

### Nested Package Group Layout

```
packages/feature-flags/          # Package group workspace
├── core/                        # Subpackage
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── hash.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── sdk-node/
│   ├── src/
│   │   ├── index.ts
│   │   ├── cache.ts
│   │   └── client.ts
│   └── package.json
├── sdk-react/
│   ├── src/
│   │   └── index.ts
│   └── package.json
├── package.json                 # Workspace root
└── README.md
```

---

## 9. How Packages Are Consumed

### Import Patterns

```typescript
// From @nova/types
import { FeatureFlag, EvaluationContext } from '@nova/types';

// From @vibetech/shared-config
import { env } from '@vibetech/shared-config';

// From @vibetech/ui subpath
import { Button, Dialog } from '@vibetech/ui/components';

// From @vibetech/hooks
import { useTheme } from '@vibetech/hooks/useTheme';
```

### Dependency Declaration

```json
{
  "dependencies": {
    "@nova/types": "workspace:*",
    "@nova/core": "workspace:*",
    "@vibetech/ui": "workspace:*",
    "@vibetech/shared-config": "workspace:*"
  }
}
```

---

## 10. Nx Integration Status

### Current State

- **NO project.json files in packages/** (not Nx-integrated yet)
- Nx workspaceLayout configured in nx.json:

  ```json
  "workspaceLayout": {
    "appsDir": "projects",
    "libsDir": "packages"
  }
  ```

- Nx recognizes packages via @nx/js plugin
- Build cache configured in nx.json targetDefaults

### Optional: To Add Nx Integration

Create `packages/[package-name]/project.json`:

```json
{
  "name": "@vibetech/new-package",
  "projectType": "library",
  "sourceRoot": "packages/new-package/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "outputPath": "dist",
        "tsConfig": "tsconfig.json",
        "packageJson": "package.json"
      }
    }
  }
}
```

**Not Required Yet:** Most packages use direct npm scripts; pnpm handles workspace management effectively.

---

## 11. Example: Recommended Template for New Package

### File: packages/[name]/package.json

```json
{
  "name": "@vibetech/[feature-name]",
  "version": "1.0.0",
  "description": "[One-line description]",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf dist"
  },
  "keywords": ["monorepo", "shared"],
  "author": "VibeTech",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.9.2",
    "rimraf": "^6.0.1"
  }
}
```

### File: packages/[name]/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### File: packages/[name]/src/index.ts

```typescript
/**
 * @vibetech/[feature-name]
 * [Description of what this package provides]
 */

export * from './main';
export * from './types';
```

### File: packages/[name]/README.md

```markdown
# @vibetech/[feature-name]

[Description]

## Installation

Part of the VibeTech monorepo. Install at workspace root:

\`\`\`bash
pnpm install
\`\`\`

## Usage

\`\`\`typescript
import { ... } from '@vibetech/[feature-name]';
\`\`\`

## API

[Document public API]

## License

MIT
```

---

## Summary Table: Existing Package Reference

| Package | Scope | Build | Exports | Key Deps | Module |
|---------|-------|-------|---------|----------|--------|
| @nova/types | @nova | tsc | Subpath | - | ESM |
| @nova/core | @nova | tsc | Subpath | @nova/types, @nova/database, zod | ESM |
| @vibetech/ui | @vibetech | tsc | Subpath | @radix-ui/*, tailwind-merge | ESM+React |
| @vibetech/shared-ipc | @vibetech | tsc | Root | uuid, zod, ws | ESM |
| @dev/feature-flags-core | @dev | tsup | Root | murmurhash | CJS+ESM |
| @vibetech/logger | @vibetech | tsc | Root | @vibetech/shared-config | ESM |
| @vibetech/hooks | @vibetech | tsc | Subpath | react (peer) | ESM |

---

## Key Takeaways

1. **Naming**: Use appropriate scope (@nova, @vibetech, @dev) and kebab-case names
2. **Build**: Use `tsc` for most packages; use `tsup` only if dual build needed
3. **Exports**: Define clear subpath exports for larger packages
4. **Dependencies**: Use `workspace:*` for internal packages
5. **Scripts**: Always include build, dev, typecheck, clean
6. **TypeScript**: Follow ES2022 target with strict mode enabled
7. **Structure**: src/ → dist/ on build; dist/ included in npm package
8. **Consumption**: Import from package name; subpaths if defined
9. **Documentation**: README.md explaining purpose and API
10. **No Nx project.json yet**: pnpm workspace management is sufficient

