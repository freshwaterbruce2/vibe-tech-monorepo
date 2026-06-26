---
name: tsup-config-optimization
description: Optimize tsup configuration for efficient builds in the VibeTech monorepo.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.0.0'
  generated_from: learning_pattern__occurrences
  success_rate: 95.0%
  category: development
---

# Tsup Configuration Optimization

**Auto-generated from successful patterns**

## Overview

This skill focuses on optimizing the `tsup` configuration for building TypeScript projects in the VibeTech monorepo. It enhances build performance and ensures consistency across multiple project setups.

## Core Capabilities

- Streamlined `tsup` configurations for multiple packages.
- Improved build speed through efficient handling of TypeScript and JavaScript files.
- Consistent output formats across different environments (development, production).
- Automatic inclusion of shared libraries from the `@nova/*` and `@vibetech/ui` packages.

## Usage Examples

### Step 1: Install tsup

Ensure that `tsup` is installed as a development dependency in your project:

```bash
pnpm add -D tsup
```

### Step 2: Create/Update tsup.config.ts

Create or update your `tsup.config.ts` file in your package directory:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // Entry file(s)
  format: ['esm', 'cjs'], // Output formats
  dts: true, // Generate declaration files
  sourcemap: true, // Enable source maps
  clean: true, // Clean output directory before each build
  minify: process.env.NODE_ENV === 'production', // Minify in production
});
```

### Step 3: Build the Project

Run the build command using `pnpm`:

```bash
pnpm tsup
```

## Integration with Monorepo

In the VibeTech monorepo, this optimization technique can be applied across various packages, ensuring that all projects leverage a consistent and optimized build process. The configuration can be placed in each package's root directory, following the established directory structure.

## Safety Measures

- **Validation:** Ensure that any changes to `tsup.config.ts` are validated by running the build command and checking for errors.
- **Snapshots:** Maintain backups of the previous configuration files located in `D:\` for rollback if necessary.
- **Rollback:** In case of any build issues, revert to the last known good configuration by restoring snapshots.

## Related Skills

- [api-data-format-standardization](#)
- [error-boundary-implementation](#)
- [database-schema-migration](#)

This skill enforces VibeTech's monorepo rules by ensuring no duplicate configurations exist across projects, mandates the use of `pnpm` for all package management, and adheres to the established paths policy within the monorepo structure.
