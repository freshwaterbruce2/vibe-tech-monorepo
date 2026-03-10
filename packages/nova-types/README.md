# @nova/types

Centralized TypeScript types for the NOVA Agent system.

## Installation

```bash
pnpm add @nova/types
```

## Usage

```typescript
import type {
    FileEvent,
    GitEvent,
    ProcessEvent,
    Activity,
    ProjectContext,
    Recommendation,
    MonitoringConfig,
} from '@nova/types';

// Activity monitoring
const fileEvent: FileEvent = {
    path: 'src/index.ts',
    eventType: 'modify',
    timestamp: Date.now(),
    project: 'my-app',
};

// Recommendations
const recommendation: Recommendation = {
    type: 'next-steps',
    priority: 'high',
    status: 'pending',
    title: 'Run tests',
    description: 'Tests have not been run recently',
    reasoning: 'Last test run was 2 hours ago',
    confidence: 0.85,
    context: {},
    createdAt: Date.now(),
};

// Monitoring config
const config: MonitoringConfig = {
    workspacePath: 'C:\\dev',
    excludePaths: ['node_modules', '.git', 'dist'],
    debounceMs: 100,
    maxEventsPerSecond: 50,
};
```

## Subpath Exports

Import specific type categories:

```typescript
import type { FileEvent, GitEvent } from '@nova/types/activity';
import type { ProjectContext, WorkspaceContext } from '@nova/types/context';
import type { Recommendation, RecommendationFeedback } from '@nova/types/recommendations';
import type { MonitoringConfig, WatcherStatus } from '@nova/types/monitoring';
```

## Type Categories

### Activity (`activity.ts`)

- `FileEvent`, `FileEventType` — File system events
- `GitEvent`, `GitEventType` — Git operations
- `ProcessEvent`, `ProcessEventType` — Process lifecycle
- `Activity`, `ActivityFilter` — Aggregated activity

### Context (`context.ts`)

- `DependencyNode`, `DependencyGraph` — Code dependencies
- `SemanticEmbedding` — AI embeddings
- `CodePattern` — Detected patterns
- `ProjectContext`, `WorkspaceContext` — Project metadata

### Monitoring (`monitoring.ts`)

- `MonitoringConfig` — Watcher configuration
- `WatcherStatus` — Runtime status
- `GitRepoInfo` — Repository state
- `DevelopmentServer` — Dev server tracking

### Recommendations (`recommendations.ts`)

- `Recommendation` — AI suggestions
- `RecommendationType`, `RecommendationPriority`, `RecommendationStatus`
- `RecommendationFeedback` — User feedback
- `PromptContext` — Context for AI prompts

## Development

```bash
# Build
pnpm nx run @nova/types:build

# Test
pnpm nx run @nova/types:test

# Watch mode
pnpm nx run @nova/types:build:watch
```
