---
name: database-schema-migration
description: A skill for managing and executing database schema migrations within the VibeTech monorepo.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.0.0'
  generated_from: learning_pattern__database-schema-migration
  success_rate: 99.0%
  category: development
---

# Database Schema Migration

**Auto-generated from successful patterns**

## Overview

This skill provides a streamlined approach for managing database schema migrations across the various projects within the VibeTech monorepo. It ensures that schema changes are applied consistently and safely, leveraging the existing tools and structures in place.

## Core Capabilities

- **Automated Migration Execution:** Run migrations automatically across Node.js and Python backend services.
- **Validation Checks:** Ensure data integrity before and after migrations.
- **Rollback Functionality:** Quickly revert to the previous schema state if issues are detected.
- **Integration with pnpm:** Enforces the usage of pnpm for package management, maintaining consistency across the monorepo.

## Usage Examples

### Basic Migration Command

To run all pending migrations for a Node.js service, execute:

```bash
pnpm run migrate --service=backend-service-name
```

### Rollback Command

To rollback the last migration for a Python service:

```bash
pnpm run rollback --service=python-service-name
```

### Validation Command

Before executing migrations, validate the current schema state:

```bash
pnpm run validate-schema --service=backend-service-name
```

## Integration with Monorepo

This skill integrates seamlessly with the VibeTech monorepo structure, allowing for efficient management of migrations across shared libraries and multiple backend services located in `V:\monorepo`. The usage of pnpm ensures that all dependencies are managed correctly without duplication or conflicts.

## Safety Measures

- **Data Snapshots:** Regular snapshots of the databases are saved in `D:\` to allow for easy recovery in case of migration failures.
- **Validation Steps:** Each migration command includes a validation step to ensure that no data integrity issues occur before applying changes.
- **Rollback Mechanism:** Migrations are designed with rollback scripts to revert to the previous schema if any errors are encountered during the migration process.

## Related Skills

- [Structured Logger Migration](#)
- [Task Management Patterns](#)
- [File Read Patterns](#)
