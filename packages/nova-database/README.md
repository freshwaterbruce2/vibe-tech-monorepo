# @nova/database

SQLite database services for the NOVA Agent system using better-sqlite3.

## Installation

```bash
pnpm add @nova/database
```

## Usage

```typescript
import { 
    ActivityDatabase, 
    ContextDatabase, 
    RecommendationsDatabase 
} from '@nova/database';

// Activity tracking
const activityDb = new ActivityDatabase('D:\\databases\\nova_activity.db');
activityDb.insertFileEvent({
    path: 'src/index.ts',
    eventType: 'modify',
    timestamp: Date.now(),
    project: 'my-app',
});
const events = activityDb.getFileEvents({ projects: ['my-app'] });

// Project context
const contextDb = new ContextDatabase('D:\\databases\\nova_context.db');
contextDb.insertProject({
    name: 'my-app',
    path: 'C:\\dev\\apps\\my-app',
    type: 'web-app',
    frameworks: ['react', 'vite'],
    lastActive: Date.now(),
    fileCount: 150,
});

// AI recommendations
const recDb = new RecommendationsDatabase('D:\\databases\\nova_recommendations.db');
recDb.insertRecommendation({
    type: 'next-steps',
    priority: 'high',
    status: 'pending',
    title: 'Run tests',
    description: 'Tests have not been run recently',
    reasoning: 'Last test run was 2 hours ago',
    confidence: 0.85,
    context: {},
    createdAt: Date.now(),
});
```

## Database Classes

### ActivityDatabase

Tracks file, git, and process events.

| Method | Description |
|--------|-------------|
| `insertFileEvent(event)` | Log file system event |
| `getFileEvents(filter?)` | Query file events |
| `insertGitEvent(event)` | Log git operation |
| `getGitEvents(filter?)` | Query git events |
| `insertProcessEvent(event)` | Log process lifecycle |
| `getProcessEvents(filter?)` | Query process events |
| `cleanupOldEvents(days)` | Remove events older than N days |
| `getActivityStats()` | Get event counts |

### ContextDatabase

Manages project metadata and code patterns.

| Method | Description |
|--------|-------------|
| `insertProject(project)` | Add/update project |
| `getProject(path)` | Get project by path |
| `getAllProjects()` | List all projects |
| `updateProject(path, updates)` | Partial update |
| `deleteProject(path)` | Remove project |
| `insertCodePattern(pattern)` | Add code pattern |
| `getCodePatterns(category?)` | Query patterns |
| `incrementPatternFrequency(id)` | Bump usage count |

### RecommendationsDatabase

Stores AI recommendations and user feedback.

| Method | Description |
|--------|-------------|
| `insertRecommendation(rec)` | Add recommendation |
| `getRecommendation(id)` | Get by ID |
| `getPendingRecommendations()` | Get actionable items |
| `getRecommendationsByType(type)` | Filter by type |
| `updateRecommendationStatus(id, status)` | Mark accepted/rejected |
| `expireOldRecommendations()` | Auto-expire old items |
| `insertFeedback(feedback)` | Record user feedback |
| `getRecommendationStats()` | Get metrics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOVA_ACTIVITY_DB_PATH` | `D:\databases\nova_activity.db` | Activity database |
| `NOVA_CONTEXT_DB_PATH` | `D:\databases\nova_context.db` | Context database |
| `NOVA_RECOMMENDATIONS_DB_PATH` | `D:\databases\nova_recommendations.db` | Recommendations database |

## Development

```bash
pnpm nx run @nova/database:build
pnpm nx run @nova/database:test
```
