# @nova/core

Core business logic for the NOVA Agent system - intelligence and persistence layers.

## Installation

```bash
pnpm add @nova/core
```

## Usage

### DatabaseManager

Manages SQLite database connections for project file indexing:

```typescript
import { DatabaseManager } from '@nova/core';

// File-based database (production)
const db = DatabaseManager.getInstance({ dbPath: 'D:\\databases\\nova.db' });
db.initialize();

// In-memory database (testing)
const testDb = DatabaseManager.getInstance({ inMemory: true });
testDb.initialize();

const conn = testDb.getConnection();
// Use conn for queries...

testDb.close();
```

### ProjectIndexer

Indexes source files into the database for search and analysis:

```typescript
import { ProjectIndexer } from '@nova/core';

const indexer = new ProjectIndexer();

// Index entire workspace
await indexer.indexWorkspace('C:\\dev\\my-project');

// Index single file (on change)
await indexer.updateSingleFile('C:\\dev\\my-project\\src\\app.ts');
```

### AutoUpdateSentinel

Watches for file changes and automatically updates the index:

```typescript
import { AutoUpdateSentinel } from '@nova/core';

const sentinel = new AutoUpdateSentinel();

// Start watching (ignores node_modules, .git, _archived)
sentinel.start('C:\\dev');

// Stop watching
sentinel.stop();
```

## Submodule Imports

```typescript
// Import specific modules
import { DatabaseManager } from '@nova/core/persistence';
import { ProjectIndexer, AutoUpdateSentinel } from '@nova/core/intelligence';
```

## Testing

```bash
pnpm test        # Run tests once
pnpm test:watch  # Watch mode
```

## License

MIT
