# SPEC-002: @nova/database Completion

## Overview

Complete the @nova/database package with missing database services and tests.

## Current State

- `activity-db.ts` — DONE (file, git, process events)
- `context-db.ts` — NOT IMPLEMENTED
- `recommendations-db.ts` — NOT IMPLEMENTED
- `sessions-db.ts` — SKIPPED (no types defined)

## Requirements

### REQ-1: context-db.ts

Store and query workspace context data. Uses types from @nova/types:

- `ProjectContext` — project metadata
- `CodePattern` — repeated code patterns
- `SemanticEmbedding` — vector embeddings (optional, complex)

**Tables needed:**

- `projects` — ProjectContext records
- `code_patterns` — CodePattern records

**Methods:**

- `insertProject(project: ProjectContext)`
- `getProject(path: string)`
- `getAllProjects()`
- `updateProject(path: string, updates: Partial<ProjectContext>)`
- `insertCodePattern(pattern: CodePattern)`
- `getCodePatterns(category?: string)`
- `close()`

### REQ-2: recommendations-db.ts

Store AI recommendations and user feedback. Uses types from @nova/types:

- `Recommendation`
- `RecommendationFeedback`

**Tables needed:**

- `recommendations`
- `recommendation_feedback`

**Methods:**

- `insertRecommendation(rec: Recommendation): number`
- `getRecommendation(id: number)`
- `getPendingRecommendations()`
- `updateRecommendationStatus(id: number, status: RecommendationStatus)`
- `insertFeedback(feedback: RecommendationFeedback)`
- `getRecommendationStats()`
- `close()`

### REQ-3: Tests

Use Vitest for testing. Test each database service with:

- Insert operations
- Query operations
- Filter operations
- Edge cases (empty results, invalid IDs)
- Use in-memory SQLite (`:memory:`) for tests

### REQ-4: README

Document the package:

- What it does
- Installation
- Usage examples for each service
- Environment variables

## Technical Constraints

- Follow activity-db.ts patterns exactly
- Use better-sqlite3
- Database paths via env vars with D:\databases defaults
- Must build with `pnpm nx build nova-database`

## Success Criteria

- All 3 database services export correctly
- Tests pass: `pnpm nx test nova-database`
- Types compile: `pnpm nx build nova-database`
