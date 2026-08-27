````yaml
---
name: api-data-format-standardization
description: Standardizes API data formats across various services in the VibeTech monorepo.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_pattern__occurrences
  success_rate: 96.0%
  category: development
---
# API Data Format Standardization

**Auto-generated from successful patterns**

## Overview
This skill aims to standardize the data formats used across APIs in the VibeTech monorepo, ensuring consistency and interoperability between different services and applications.

## Core Capabilities
- Enforces a consistent data structure for API responses.
- Validates incoming and outgoing data formats.
- Automatically generates TypeScript interfaces for standardized formats.
- Integrates seamlessly with backend Node.js and Python services.

## Usage Examples
1. **Standardizing API Responses**:
   Use the following command to apply the standard format to a specific API service in the `backend` category.
   ```bash
   pnpm run standardize-api-format --service=my-service
````

2. **Generating TypeScript Interfaces**:  
   Automatically generate TypeScript interfaces for your API responses using:

   ```bash
   pnpm run generate-types --service=my-service
   ```

3. **Validation**:  
   To validate API responses against the standard format:
   ```bash
   pnpm run validate-api --service=my-service
   ```

## Integration with Monorepo

This skill is designed to integrate with the VibeTech monorepo structure by ensuring all API services in the `backend` folder adhere to the standardized data formats. It utilizes pnpm for dependency management and works in conjunction with existing shared libraries in `@nova/*` and `@vibetech/ui`.

## Safety Measures

- **D:\ Snapshots**: Regular snapshots of the data/logs/databases on D:\ ensure that no data is lost during the standardization process.
- **Validation**: Before applying format changes, a validation step checks for compliance with the standard format.
- **Rollback**: In case of failure, easily revert to the last snapshot to restore the previous state.

## Related Skills

- [database-schema-migration](./database-schema-migration.md)
- [file-read-patterns](./file-read-patterns.md)
- [error-boundary-implementation](./error-boundary-implementation.md)
