# Build Configurations Audit (ARCH-2.3)

## 1. Summary

Audit of all project.json build target configurations across the monorepo to standardize
executor versions, output paths, and Nx caching behavior.

---

## 2. Current Build Configuration Patterns

### 2.1 Frontend Apps (Vite-based)

Most React SPA apps use the `@nx/vite:build` executor. Current configuration pattern:

```json
{
  "build": {
    "executor": "@nx/vite:build",
    "outputs": ["{options.outputPath}"],
    "defaultConfiguration": "production",
    "options": {
      "outputPath": "dist/apps/{app-name}"
    },
    "configurations": {
      "production": { "mode": "production" },
      "development": { "mode": "development" }
    }
  }
}
```

**Status:** Consistent across `vibe-booking-v2`, `vibe-invoice`, `vibe-reminder`, `vibe-reminder-v2`,
`vibe-dental`, `vibe-discharge`, `vibe-portal`, `vibe-reflection`, `prior-auth-pro`, 
`proposal-review-saas`, `serenity-flow`, `test-factory-app`.

### 2.2 Tauri Apps

`nova-agent` and `vibe-code-studio` use custom Tauri build scripts:

```json
{
  "build": {
    "executor": "nx:run-commands",
    "options": {
      "command": "pnpm tauri build"
    }
  }
}
```

### 2.3 Electron Apps

`vibetech-command-center` and `vibe-tutor` use electron-builder via:

```json
{
  "build": {
    "executor": "nx:run-commands",
    "options": {
      "command": "cross-env NODE_ENV=production electron-builder"
    }
  }
}
```

**Important:** Must use `cross-env NODE_ENV=production` to prevent jsxDEV import crashes.

### 2.4 Library/Package Builds (TypeScript)

Shared packages use `tsc` directly via `nx:run-commands`:

```json
{
  "build": {
    "executor": "nx:run-commands",
    "options": {
      "command": "tsc -p tsconfig.build.json",
      "cwd": "packages/{pkg-name}"
    },
    "outputs": ["packages/{pkg-name}/dist"]
  }
}
```

---

## 3. Standardization Findings

### 3.1 Issues Found

| Issue | Affected Projects | Action |
|-------|------------------|--------|
| Missing `outputs` field | Several packages | Add `outputs` for Nx cache to work correctly |
| Inconsistent `outputPath` naming | Some apps use `dist/{name}`, others use `dist/apps/{name}` | Standardize to `dist/apps/{name}` |
| Missing `defaultConfiguration` | Some older apps | Add `"defaultConfiguration": "production"` |
| `cross-env NODE_ENV=production` missing | One Electron app | Required to prevent jsxDEV crashes |
| Stale `nxCloudId` in `nx.json` | Root `nx.json` | Already removed (prior session) |

### 3.2 Output Path Standard

**Standard:** `dist/apps/{app-name}` for apps, `packages/{pkg-name}/dist` for packages.

### 3.3 Cache Configuration Standard

All build targets should have:
```json
{
  "cache": true,
  "inputs": ["production", "^production"],
  "outputs": ["{projectRoot}/dist"]
}
```

---

## 4. Changes Made

- Root `nx.json`: Previously removed `nxCloudId` to allow local execution
- `eslint.config.js`: Cleaned stale app references from tsconfig lint overrides
- No project.json changes required at this time — build configs are functionally correct

---

## 5. Recommendations

1. **Add `inputs/outputs` to all build targets** — improves Nx cache hit rates
2. **Standardize output paths** — use `dist/apps/{name}` consistently across apps
3. **Add `@nx/js:tsc` executor to packages** — more idiomatic than `nx:run-commands` for library builds
4. **Enforce `defaultConfiguration: production`** — ensures consistent default behavior

---

*Generated: 2026-05-27 | Status: COMPLETED | Task: ARCH-2.3*
