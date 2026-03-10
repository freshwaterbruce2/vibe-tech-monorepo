# Advanced Nx Configuration Reference

## Complete nx.json Schema

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "plugins": [
    {
      "plugin": "@nx/js",
      "options": {
        "analyzeSourceFiles": true
      }
    }
  ],
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "packages"
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/**/*.test.ts",
      "!{projectRoot}/**/test-setup.ts",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/eslint.config.*",
      "!{projectRoot}/jest.config.*",
      "!{projectRoot}/vitest.config.*"
    ],
    "sourceOnly": [
      "{projectRoot}/src/**/*",
      "{projectRoot}/package.json",
      "{projectRoot}/tsconfig*.json"
    ],
    "configOnly": [
      "{projectRoot}/package.json",
      "{projectRoot}/tsconfig*.json",
      "{projectRoot}/project.json"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/tsconfig.base.json",
      "{workspaceRoot}/nx.json",
      "{workspaceRoot}/.eslintrc.json"
    ]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["default", "^production"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json", "{workspaceRoot}/eslint.config.*"],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["sourceOnly", "^sourceOnly", "sharedGlobals"],
      "cache": true
    }
  },
  "parallel": 3,
  "cacheDirectory": ".nx/cache",
  "defaultBase": "main",
  "affected": {
    "defaultBase": "main"
  },
  "release": {
    "version": {
      "generatorOptions": {
        "specifierSource": "conventional-commits"
      }
    },
    "projects": ["*"],
    "projectsRelationship": "independent"
  }
}
```

## Project-Level Configuration (project.json)

```json
{
  "name": "my-app",
  "sourceRoot": "apps/my-app/src",
  "projectType": "application",
  "tags": ["scope:app", "type:frontend", "platform:web"],
  "implicitDependencies": ["shared-utils"],
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/my-app"
      },
      "configurations": {
        "production": {
          "mode": "production"
        },
        "development": {
          "mode": "development"
        }
      }
    },
    "dev": {
      "executor": "@nx/vite:dev-server",
      "options": {
        "buildTarget": "my-app:build:development",
        "port": 5173
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/my-app/**/*.{ts,tsx}"]
      }
    }
  }
}
```

## Module Boundary Enforcement

### Tag-Based Dependency Rules

```js
// eslint.config.js or .eslintrc.json
{
  "@nx/enforce-module-boundaries": ["error", {
    "enforceBuildableLibDependency": true,
    "allow": [],
    "depConstraints": [
      // Apps can depend on shared libs and feature libs
      {
        "sourceTag": "scope:app",
        "onlyDependOnLibsWithTags": ["scope:shared", "scope:feature"]
      },
      // Feature libs can depend on shared libs only
      {
        "sourceTag": "scope:feature",
        "onlyDependOnLibsWithTags": ["scope:shared"]
      },
      // Shared libs can only depend on other shared libs
      {
        "sourceTag": "scope:shared",
        "onlyDependOnLibsWithTags": ["scope:shared"]
      },
      // UI components cannot depend on data/state libs
      {
        "sourceTag": "type:ui",
        "onlyDependOnLibsWithTags": ["type:ui", "type:util"]
      },
      // Data libs cannot depend on UI libs
      {
        "sourceTag": "type:data",
        "onlyDependOnLibsWithTags": ["type:data", "type:util"]
      }
    ]
  }]
}
```

### Recommended Tag Taxonomy

**Scope tags** (what domain):
- `scope:app` - Deployable applications
- `scope:feature` - Feature-specific libraries
- `scope:shared` - Cross-cutting shared libraries

**Type tags** (what layer):
- `type:ui` - UI components
- `type:data` - State management, API clients
- `type:util` - Pure utility functions
- `type:feature` - Full feature modules

**Platform tags** (what target):
- `platform:web` - Browser-based
- `platform:desktop` - Electron/Tauri
- `platform:mobile` - Capacitor/React Native
- `platform:node` - Server-side

## Distributed Task Execution

### Nx Cloud Configuration

```json
{
  "nxCloudId": "your-cloud-id",
  "nxCloudAccessToken": "your-token",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "typecheck"],
        "parallel": 3
      }
    }
  }
}
```

### CI Pipeline Optimization

```yaml
# .github/workflows/ci.yml - Optimized with Nx
jobs:
  affected:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: pnpm nx affected -t lint test build --base=${{ github.event.before }} --head=${{ github.sha }} --parallel=3
```

## Performance Benchmarks

| Operation | Cold (no cache) | Warm (cached) | Improvement |
|-----------|----------------|---------------|-------------|
| Build all | ~45s | ~5s | 89% |
| Lint all | ~30s | ~3s | 90% |
| Typecheck | ~25s | ~2s | 92% |
| Test all | ~60s | ~8s | 87% |
| Affected build | ~15s | ~2s | 87% |

These benchmarks are from the VibeTech monorepo with ~52 projects.
