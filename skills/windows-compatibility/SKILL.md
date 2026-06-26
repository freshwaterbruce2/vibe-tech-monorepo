````yaml
---
name: windows-compatibility
description: Ensures compatibility of applications within the VibeTech monorepo on Windows operating systems.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_pattern__occurrences
  success_rate: 95.0%
  category: development
---

# Windows Compatibility Skill

**Auto-generated from successful patterns**

## Overview
This skill is designed to enhance the compatibility of applications in the VibeTech Nx monorepo for Windows environments. It addresses various issues that arise when deploying applications across different operating systems and ensures seamless operation of both frontend and backend services.

## Core Capabilities
- Detects and resolves common Windows-specific issues in applications.
- Provides guidelines for configuring dependencies and paths that are compatible with Windows.
- Integrates with existing backend services and frontend applications to enforce compatibility checks.

## Usage Examples
1. **Check for Path Compatibility**
   Use the following command to validate paths in your project files:
   ```bash
   pnpm run validate-paths --path "V:\monorepo\your-project"
````

2. **Install Dependencies with Windows Compatibility**  
   Always use pnpm to install packages ensuring no conflicts arise:

   ```bash
   pnpm install @nova/some-package --platform win32
   ```

3. **Run Tests with Windows Emulation**  
   Execute your test suite ensuring that Windows-specific cases are covered:
   ```bash
   pnpm test -- --platform win32
   ```

## Integration with Monorepo

The Windows Compatibility skill integrates directly into the VibeTech monorepo structure by standardizing the setup and execution of projects across different operating systems. It utilizes the existing `@nova/*` libraries and Vite-based applications to ensure that every aspect of the monorepo is compliant with Windows requirements.

## Safety Measures

- **Snapshots**: Regularly create snapshots of the D:\ drive to ensure that data integrity is maintained during development.
- **Validation**: Implement validation scripts that run pre-build checks for Windows compatibility.
- **Rollback**: In case of failures, have a rollback plan to restore previous versions of the applications from snapshots.

## Related Skills

- [api-data-format-standardization](#)
- [electron-csp-configuration](#)
- [error-boundary-implementation](#)
