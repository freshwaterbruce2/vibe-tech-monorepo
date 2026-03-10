# Architecture: VibeTech Memory & Learning System

**Version**: 1.0.0
**Date**: 2026-02-12
**Related**: PRD.md, ROADMAP.md

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Flow](#3-data-flow)
4. [Memory Types Deep Dive](#4-memory-types-deep-dive)
5. [Storage Layer](#5-storage-layer)
6. [Embedding Pipeline](#6-embedding-pipeline)
7. [MCP Server Design](#7-mcp-server-design)
8. [Hook Integration](#8-hook-integration)
9. [API Reference](#9-api-reference)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Assistants Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Claude Code  │  │ Gemini CLI   │  │Claude Desktop│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │ MCP Protocol                    │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    MCP Server Layer                          │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │         apps/memory-mcp (TypeScript)                   │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐       │ │
│  │  │ Tool       │  │ Validation │  │ Response   │       │ │
│  │  │ Handlers   │  │ Layer      │  │ Formatter  │       │ │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │ │
│  │        │                │                │              │ │
│  │        └────────────────┼────────────────┘              │ │
│  └─────────────────────────┼──────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                   Core Memory Layer                          │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │      packages/memory (Shared TypeScript Library)       │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Episodic    │  │  Semantic    │  │ Procedural   │ │ │
│  │  │  Store       │  │  Graph       │  │  Store       │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  │         │                  │                  │         │ │
│  │  ┌──────▼──────────────────▼──────────────────▼──────┐ │ │
│  │  │          Memory Manager (Core API)               │ │ │
│  │  └──────┬──────────────────┬──────────────────┬──────┘ │ │
│  │         │                  │                  │         │ │
│  │  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐ │ │
│  │  │ Embedding   │  │ Search Engine   │  │ Consolidate│ │ │
│  │  │ Service     │  │ (Vector+Graph)  │  │ Service    │ │ │
│  │  └──────┬──────┘  └────────┬────────┘  └─────┬──────┘ │ │
│  └─────────┼───────────────────┼───────────────────┼──────┘ │
└────────────┼───────────────────┼───────────────────┼────────┘
             │                   │                   │
┌────────────┼───────────────────┼───────────────────┼────────┐
│            │      Storage Layer (D:\)              │        │
│  ┌─────────▼───────────────────▼───────────────────▼──────┐ │
│  │                 D:\databases\memory.db                 │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  SQLite 3.45+ with sqlite-vec extension         │ │ │
│  │  │                                                   │ │ │
│  │  │  Tables:                                          │ │ │
│  │  │  - episodic_memories      - vec_episodic         │ │ │
│  │  │  - semantic_entities      - vec_semantic         │ │ │
│  │  │  - semantic_relations     - vec_procedural       │ │ │
│  │  │  - semantic_observations  - sessions             │ │ │
│  │  │  - procedural_memories    - consolidation_log    │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               D:\logs\memory-system\                    │ │
│  │  - operations.log  - consolidation.log  - errors.log   │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────────────────┐
│              Embedding Service Layer                        │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐│
│  │   Ollama (Primary)       │  │ Transformers.js (Fallback││
│  │   localhost:11434        │  │ In-process, Node.js)     ││
│  │   nomic-embed-text       │  │ all-MiniLM-L6-v2         ││
│  │   768 dimensions         │  │ 384 dimensions           ││
│  └──────────────────────────┘  └──────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────────────────┐
│              Hook Integration Layer                         │
│                                                             │
│  .claude/hooks/ (PowerShell scripts)                       │
│  - session-start.ps1     → Load relevant memories          │
│  - pre-tool-use.ps1      → Log intent (lightweight)        │
│  - post-tool-use.ps1     → Log outcome (persisted)         │
│  - session-end.ps1       → Consolidate session             │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Package: `@vibetech/memory` (packages/memory)

**Location**: `C:\dev\packages\memory\`

**Responsibilities**:
- Core memory operations (store, retrieve, search)
- Database connection management
- Embedding generation and caching
- Memory type implementations
- Consolidation logic

**Directory Structure**:
```
packages/memory/
├── src/
│   ├── core/
│   │   ├── MemoryManager.ts        # Main API entry point
│   │   ├── EmbeddingService.ts     # Ollama + Transformers.js
│   │   ├── SearchEngine.ts         # Vector + graph search
│   │   └── ConsolidationService.ts # Episodic → Semantic
│   ├── stores/
│   │   ├── EpisodicStore.ts        # Timestamped experiences
│   │   ├── SemanticStore.ts        # Knowledge graph
│   │   └── ProceduralStore.ts      # Learned workflows
│   ├── types/
│   │   ├── memory.types.ts         # Core type definitions
│   │   ├── embedding.types.ts      # Embedding types
│   │   └── search.types.ts         # Search types
│   ├── db/
│   │   ├── schema.ts               # SQLite schema
│   │   ├── migrations.ts           # Schema migrations
│   │   └── connection.ts           # better-sqlite3 wrapper
│   ├── utils/
│   │   ├── logger.ts               # Winston logger
│   │   ├── decay.ts                # Memory decay algorithms
│   │   └── normalization.ts        # Vector normalization
│   └── index.ts                    # Public API exports
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── README.md
```

**Public API** (exported from `index.ts`):
```typescript
import { MemoryManager } from '@vibetech/memory';

// Initialize
const memory = new MemoryManager({
  dbPath: 'D:\\databases\\memory.db',
  embeddingProvider: 'ollama', // or 'transformers'
  embeddingModel: 'nomic-embed-text',
  logPath: 'D:\\logs\\memory-system'
});

// Episodic operations
await memory.storeEpisode({ ... });
const episodes = await memory.searchEpisodes(query, { limit: 10 });
const recent = await memory.getRecentEpisodes({ project: 'nova-agent', limit: 20 });

// Semantic operations
await memory.storeFact({ entity: 'React', type: 'library', observation: '...' });
const facts = await memory.queryKnowledge({ entity: 'React' });
const graph = await memory.getKnowledgeGraph({ depth: 2 });

// Procedural operations
await memory.storeProcedure({ name: 'nx-new-app', steps: [...] });
const proc = await memory.getProcedure({ trigger: 'create new app' });

// Search
const results = await memory.search(query, { types: ['episodic', 'semantic'], limit: 10 });

// Consolidation
await memory.consolidate({ mode: 'auto' });

// Health
const health = await memory.getHealth();
```

---

### 2.2 App: `memory-mcp` (apps/memory-mcp)

**Location**: `C:\dev\apps\memory-mcp\`

**Responsibilities**:
- MCP protocol implementation
- Tool registration and handling
- Request validation
- Response formatting
- Error handling

**Directory Structure**:
```
apps/memory-mcp/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── tools/
│   │   ├── episodic.tools.ts    # memory_store_episode, memory_recall_recent
│   │   ├── semantic.tools.ts    # memory_store_fact, memory_query_knowledge
│   │   ├── procedural.tools.ts  # memory_store_procedure, memory_get_procedure
│   │   ├── search.tools.ts      # memory_search
│   │   ├── system.tools.ts      # memory_health, memory_consolidate
│   │   └── index.ts             # Tool registry
│   ├── validation/
│   │   ├── schemas.ts           # Zod validation schemas
│   │   └── sanitize.ts          # Input sanitization
│   ├── formatters/
│   │   └── response.ts          # MCP response formatting
│   └── config.ts                # Server configuration
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

**MCP Tool Definitions**:
```typescript
// Example: memory_search tool
{
  name: "memory_search",
  description: "Semantic search across all memory types",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      types: {
        type: "array",
        items: { type: "string", enum: ["episodic", "semantic", "procedural"] },
        description: "Memory types to search (default: all)"
      },
      limit: { type: "number", default: 10, maximum: 50 },
      project: { type: "string", description: "Filter by project" },
      timeRange: {
        type: "object",
        properties: {
          start: { type: "string", format: "date-time" },
          end: { type: "string", format: "date-time" }
        }
      }
    },
    required: ["query"]
  }
}
```

---

## 3. Data Flow

### 3.1 Memory Storage Flow

```
┌────────────────┐
│  AI Assistant  │
└───────┬────────┘
        │ "Remember this: User prefers pnpm over npm"
        │
        ▼
┌───────────────────┐
│  MCP Server       │
│  (memory-mcp)     │
│                   │
│  1. Validate      │
│  2. Route to tool │
└───────┬───────────┘
        │
        ▼
┌────────────────────────────────┐
│  MemoryManager                 │
│  (@vibetech/memory)            │
│                                │
│  3. Determine memory type      │  → Semantic (fact about preference)
│  4. Generate embedding         │  → Call EmbeddingService
│  5. Store to appropriate store │  → SemanticStore
└───────┬────────────────────────┘
        │
        ▼
┌────────────────────────────────┐
│  EmbeddingService              │
│                                │
│  6. Try Ollama first           │
│     localhost:11434/embed      │
│  7. Fallback to Transformers   │
│     if Ollama unavailable      │
│  8. Return Float32Array[768]   │
└───────┬────────────────────────┘
        │
        ▼
┌────────────────────────────────┐
│  SemanticStore                 │
│                                │
│  9. Create entity (pnpm)       │
│  10. Add observation           │
│  11. Insert vector embedding   │
│  12. Create relation if needed │
└───────┬────────────────────────┘
        │
        ▼
┌────────────────────────────────┐
│  SQLite + sqlite-vec           │
│  D:\databases\memory.db        │
│                                │
│  BEGIN TRANSACTION;            │
│    INSERT INTO semantic_       │
│      entities(...)             │
│    INSERT INTO semantic_       │
│      observations(...)         │
│    INSERT INTO vec_semantic    │
│      (entity_id, embedding)    │
│  COMMIT;                       │
└────────────────────────────────┘
```

### 3.2 Memory Retrieval Flow (Semantic Search)

```
┌────────────────┐
│  AI Assistant  │
└───────┬────────┘
        │ Query: "What package manager does the user prefer?"
        │
        ▼
┌───────────────────┐
│  MCP Server       │
│  (memory_search)  │
└───────┬───────────┘
        │
        ▼
┌────────────────────────────────┐
│  SearchEngine                  │
│                                │
│  1. Generate query embedding   │
│  2. Parallel search:           │
│     - Vector search (sqlite-vec)│
│     - Keyword search (FTS5)    │
│  3. Merge results (RRF)        │
│  4. Apply decay/recency        │
│  5. Rank by relevance          │
└───────┬────────────────────────┘
        │
        ▼
┌────────────────────────────────┐
│  SQLite Queries                │
│                                │
│  -- Vector KNN search          │
│  SELECT entity_id, distance    │
│  FROM vec_semantic             │
│  WHERE embedding MATCH ?       │
│  ORDER BY distance LIMIT 20;   │
│                                │
│  -- Keyword search             │
│  SELECT entity_id              │
│  FROM semantic_entities_fts    │
│  WHERE semantic_entities_fts   │
│    MATCH ?                     │
│  LIMIT 20;                     │
│                                │
│  -- Reciprocal Rank Fusion     │
│  (merge + rank results)        │
└───────┬────────────────────────┘
        │
        ▼
┌────────────────────────────────┐
│  Result Formatting             │
│                                │
│  - Hydrate entity details      │
│  - Include observations        │
│  - Add confidence scores       │
│  - Format for MCP response     │
└───────┬────────────────────────┘
        │
        ▼
┌────────────────────────────────┐
│  MCP Response                  │
│                                │
│  {                             │
│    "results": [{               │
│      "entity": "pnpm",         │
│      "type": "package_manager",│
│      "observation": "User      │
│        prefers pnpm over npm", │
│      "confidence": 0.95,       │
│      "relevance": 0.87         │
│    }]                          │
│  }                             │
└────────────────────────────────┘
```

### 3.3 Hook-Triggered Learning Flow

```
┌────────────────┐
│  Developer     │
│  executes:     │
│  pnpm nx build │
└───────┬────────┘
        │
        ▼
┌─────────────────────────────┐
│  Claude Code                │
│  Calls tool: Bash           │
└───────┬─────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  post-tool-use.ps1 hook     │
│  (lightweight, async)       │
│                             │
│  1. Extract event data      │
│  2. Call memory API         │
│  3. Fire-and-forget         │
└───────┬─────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  MemoryManager              │
│  storeEpisode()             │
│                             │
│  Event: {                   │
│    type: 'tool_use',        │
│    tool: 'Bash',            │
│    command: 'pnpm nx build',│
│    project: 'nova-agent',   │
│    success: true,           │
│    duration: 12.3s          │
│  }                          │
└───────┬─────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  Stored as episodic memory  │
│  in memory.db               │
└─────────────────────────────┘
        │
        │ (Later, during consolidation)
        ▼
┌─────────────────────────────┐
│  ConsolidationService       │
│                             │
│  Pattern detected:          │
│  - 50+ episodes of          │
│    "pnpm nx build"          │
│  - Always for nova-agent    │
│  - Success rate: 98%        │
│                             │
│  → Extract semantic fact    │
└───────┬─────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  Create semantic memory:    │
│                             │
│  Entity: "nova-agent"       │
│  Relation: "builds_with"    │
│  Target: "pnpm nx build"    │
│  Confidence: 0.95           │
└─────────────────────────────┘
```

---

## 4. Memory Types Deep Dive

### 4.1 Episodic Memory

**Purpose**: Store specific experiences with full temporal and contextual information

**Data Model**:
```typescript
interface EpisodicMemory {
  id: number;
  sessionId: string;
  timestamp: string; // ISO 8601
  eventType: 'tool_use' | 'conversation' | 'error' | 'decision' | 'outcome';
  content: string; // Raw event description
  context: {
    project?: string;
    file?: string;
    branch?: string;
    tags?: string[];
  };
  keywords: string[]; // Auto-extracted
  importance: number; // 0.0-1.0
  decayFactor: number; // Decays over time
  embedding?: Float32Array; // 768d vector
}
```

**Storage Strategy**:
- Inserted on every significant event (tool use, error, decision)
- Never updated (immutable record)
- Decays over time (decayFactor reduces based on age and access)
- Can be archived after 90 days (moved to episodic_archive table)

**Retrieval Strategies**:
1. **Temporal**: Most recent N episodes for a project
2. **Semantic**: Vector similarity search for relevant episodes
3. **Hybrid**: Recent + relevant (RRF merge)

---

### 4.2 Semantic Memory

**Purpose**: Store abstract facts and relationships about the world

**Data Model**:
```typescript
interface SemanticEntity {
  id: number;
  name: string; // "React", "pnpm", "VibeTech monorepo"
  entityType: 'project' | 'library' | 'pattern' | 'preference' | 'fact';
  description: string;
  metadata: Record<string, any>;
  confidence: number; // 0.0-1.0
  embedding?: Float32Array;
}

interface SemanticRelation {
  id: number;
  sourceId: number;
  targetId: number;
  relationType: string; // "uses", "depends_on", "replaced_by", etc.
  weight: number; // 0.0-1.0 strength
  metadata?: Record<string, any>;
}

interface SemanticObservation {
  id: number;
  entityId: number;
  content: string; // Atomic fact about the entity
  source: string; // Where this was learned
  createdAt: string;
}
```

**Storage Strategy**:
- Entities created via consolidation or explicit storage
- Relations auto-discovered or explicitly defined
- Observations accumulated over time
- Confidence scores updated based on evidence

**Graph Queries**:
```typescript
// Find all libraries used by nova-agent
memory.queryKnowledge({
  entity: 'nova-agent',
  relationType: 'uses',
  depth: 1
});

// Find replacement suggestions for deprecated library
memory.queryKnowledge({
  entity: 'old-library',
  relationType: 'replaced_by',
  depth: 1
});

// Get full context around a concept
memory.queryKnowledge({
  entity: 'React 19',
  depth: 2, // Include second-degree relations
  includeObservations: true
});
```

---

### 4.3 Procedural Memory

**Purpose**: Capture learned workflows and decision heuristics

**Data Model**:
```typescript
interface ProceduralMemory {
  id: number;
  name: string; // "create-nx-app"
  description: string;
  triggerPattern: string; // "user wants to create new app"
  steps: Array<{
    order: number;
    action: string;
    command?: string;
    validation?: string;
  }>;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  embedding?: Float32Array;
}
```

**Example**:
```json
{
  "name": "create-nx-app",
  "description": "Standard procedure for creating a new Nx app in the monorepo",
  "triggerPattern": "create new (app|application|project)",
  "steps": [
    {
      "order": 1,
      "action": "Check if app name is available",
      "command": "ls apps/ | grep <name>",
      "validation": "grep should return empty"
    },
    {
      "order": 2,
      "action": "Generate app with Nx",
      "command": "pnpm nx g @nx/react:app <name>",
      "validation": "apps/<name>/package.json exists"
    },
    {
      "order": 3,
      "action": "Configure project.json",
      "validation": "project.json has correct tags"
    },
    {
      "order": 4,
      "action": "Add to WORKSPACE.json",
      "validation": "WORKSPACE.json includes new app"
    }
  ],
  "successCount": 12,
  "failureCount": 1
}
```

**Learning Strategy**:
- Procedures created from repeated episode patterns
- Success/failure counts updated on execution
- Steps refined based on actual outcomes
- Low-success procedures flagged for review

---

## 5. Storage Layer

### 5.1 SQLite + sqlite-vec Configuration

**Database File**: `D:\databases\memory.db`

**Initialization**:
```typescript
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const db = new Database('D:\\databases\\memory.db');

// Load sqlite-vec extension
sqliteVec.load(db);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache

// Foreign keys
db.pragma('foreign_keys = ON');
```

**Vector Tables**:
```sql
-- Episodic vector index
CREATE VIRTUAL TABLE vec_episodic USING vec0(
  memory_id INTEGER PRIMARY KEY,
  embedding float[768]
);

-- Semantic vector index
CREATE VIRTUAL TABLE vec_semantic USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[768]
);

-- Procedural vector index
CREATE VIRTUAL TABLE vec_procedural USING vec0(
  memory_id INTEGER PRIMARY KEY,
  embedding float[768]
);
```

**Vector Search Example**:
```typescript
// Generate query embedding
const queryEmbedding = await embeddingService.embed(query);

// KNN search (top 10 nearest neighbors)
const results = db.prepare(`
  SELECT
    e.id,
    e.content,
    e.timestamp,
    v.distance
  FROM vec_episodic v
  JOIN episodic_memories e ON e.id = v.memory_id
  WHERE v.embedding MATCH ?
  ORDER BY v.distance
  LIMIT 10
`).all(queryEmbedding.buffer);

// Distance is L2 (Euclidean) by default
// Smaller distance = more similar
```

### 5.2 Full-Text Search (Hybrid)

For hybrid search (vector + keyword), also create FTS5 tables:

```sql
-- FTS5 for episodic keyword search
CREATE VIRTUAL TABLE episodic_fts USING fts5(
  content,
  keywords,
  content='episodic_memories',
  content_rowid='id'
);

-- Keep FTS in sync with main table
CREATE TRIGGER episodic_fts_insert AFTER INSERT ON episodic_memories BEGIN
  INSERT INTO episodic_fts(rowid, content, keywords)
  VALUES (new.id, new.content, new.keywords);
END;

-- Similar triggers for UPDATE and DELETE
```

**Hybrid Search**:
```typescript
// Vector results
const vectorResults = await vectorSearch(queryEmbedding);

// Keyword results
const keywordResults = db.prepare(`
  SELECT id, rank
  FROM episodic_fts
  WHERE episodic_fts MATCH ?
  ORDER BY rank
  LIMIT 20
`).all(query);

// Reciprocal Rank Fusion
const merged = reciprocalRankFusion([vectorResults, keywordResults], {
  k: 60 // RRF parameter
});
```

---

## 6. Embedding Pipeline

### 6.1 Embedding Service Architecture

```typescript
interface EmbeddingService {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  getProviderStatus(): Promise<{ ollama: boolean; transformers: boolean }>;
}

class EmbeddingServiceImpl implements EmbeddingService {
  private ollamaClient: Ollama;
  private transformersModel?: any;
  private cache: Map<string, Float32Array>; // LRU cache

  async embed(text: string): Promise<Float32Array> {
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) return cached;

    // Try Ollama (primary)
    try {
      const response = await this.ollamaClient.embeddings({
        model: 'nomic-embed-text',
        prompt: text
      });
      const embedding = new Float32Array(response.embedding);
      this.cache.set(text, embedding);
      return embedding;
    } catch (ollamaError) {
      logger.warn('Ollama unavailable, falling back to Transformers.js');
    }

    // Fallback to Transformers.js
    const embedding = await this.transformersEmbed(text);
    this.cache.set(text, embedding);
    return embedding;
  }

  private async transformersEmbed(text: string): Promise<Float32Array> {
    if (!this.transformersModel) {
      const { pipeline } = await import('@huggingface/transformers');
      this.transformersModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    }

    const output = await this.transformersModel(text, {
      pooling: 'mean',
      normalize: true
    });

    return new Float32Array(output.data);
  }
}
```

### 6.2 Embedding Dimension Handling

**Challenge**: nomic-embed-text (768d) vs all-MiniLM-L6-v2 (384d)

**Solution**: Normalize to 768d with zero-padding for transformers output

```typescript
function normalizeEmbedding(
  embedding: Float32Array,
  targetDim: number = 768
): Float32Array {
  if (embedding.length === targetDim) {
    return embedding;
  }

  if (embedding.length < targetDim) {
    // Zero-pad
    const normalized = new Float32Array(targetDim);
    normalized.set(embedding);
    return normalized;
  }

  // Truncate (shouldn't happen in our case)
  return embedding.slice(0, targetDim);
}
```

---

## 7. MCP Server Design

### 7.1 Server Initialization

```typescript
// apps/memory-mcp/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MemoryManager } from '@vibetech/memory';
import { registerTools } from './tools/index.js';

const server = new Server(
  {
    name: 'vibetech-memory',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize memory manager
const memory = new MemoryManager({
  dbPath: process.env.MEMORY_DB_PATH || 'D:\\databases\\memory.db',
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || 'ollama') as 'ollama' | 'transformers',
  embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
  logPath: process.env.LOG_PATH || 'D:\\logs\\memory-system',
});

await memory.initialize();

// Register all tools
registerTools(server, memory);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 7.2 Tool Handler Example

```typescript
// apps/memory-mcp/src/tools/search.tools.ts
import { z } from 'zod';

const memorySearchSchema = z.object({
  query: z.string().min(1).max(500),
  types: z.array(z.enum(['episodic', 'semantic', 'procedural'])).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  project: z.string().optional(),
  timeRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
});

export function registerSearchTools(server: Server, memory: MemoryManager) {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'memory_search',
        description: 'Semantic search across all memory types',
        inputSchema: zodToJsonSchema(memorySearchSchema),
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_search') return;

    const args = memorySearchSchema.parse(request.params.arguments);

    try {
      const results = await memory.search(args.query, {
        types: args.types,
        limit: args.limit,
        project: args.project,
        timeRange: args.timeRange,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });
}
```

---

## 8. Hook Integration

### 8.1 Hook Architecture

**Constraints**:
- Hooks must execute in <30ms (target) or <100ms (max)
- Cannot block Claude Code's main flow
- Must handle failures gracefully (silent fail, log error)

**Strategy**: Fire-and-forget async HTTP calls to local memory API

### 8.2 post-tool-use.ps1 Implementation

```powershell
# .claude/hooks/post-tool-use.ps1

param($ToolUse, $ToolResult)

# Quick validation
if (-not $ToolUse -or -not $ToolResult) {
    return
}

# Extract event data (lightweight)
$event = @{
    type = "tool_use"
    tool = $ToolUse.name
    timestamp = (Get-Date -Format "o")
    project = (Get-Location).Path -replace '.*\\apps\\([^\\]+).*', '$1'
    success = -not $ToolResult.is_error
} | ConvertTo-Json -Compress

# Fire-and-forget HTTP call to memory API
try {
    $null = Invoke-WebRequest `
        -Uri "http://localhost:3333/api/memory/episode" `
        -Method POST `
        -Body $event `
        -ContentType "application/json" `
        -TimeoutSec 1 `
        -ErrorAction SilentlyContinue
} catch {
    # Silent fail - don't disrupt user flow
    # Error logged server-side
}
```

### 8.3 Local Memory HTTP API

To support hooks, the memory-mcp server also runs a lightweight HTTP endpoint:

```typescript
// apps/memory-mcp/src/api/httpServer.ts
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/memory/episode', async (req, res) => {
  try {
    const event = req.body;

    // Non-blocking store
    setImmediate(async () => {
      try {
        await memory.storeEpisode({
          sessionId: getCurrentSessionId(),
          eventType: event.type,
          content: JSON.stringify(event),
          context: { project: event.project },
          importance: event.success ? 0.3 : 0.7, // Failures more important
        });
      } catch (error) {
        logger.error('Failed to store episode from hook', error);
      }
    });

    // Respond immediately
    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3333, 'localhost', () => {
  logger.info('Memory HTTP API listening on http://localhost:3333');
});
```

---

## 9. API Reference

See PRD.md Section 5.4 for MCP tool specifications.

See `packages/memory/README.md` (to be created) for full TypeScript API documentation.

---

## 10. Deployment Architecture

### 10.1 Development Environment

```
Developer Machine (Windows 11)
├── C:\dev (Code)
│   ├── packages\memory\ (Build outputs to dist/)
│   └── apps\memory-mcp\ (Build outputs to dist/)
├── D:\databases\memory.db (Data)
├── D:\logs\memory-system\ (Logs)
└── Ollama Service (localhost:11434)
```

**Build Process**:
```bash
# Build shared library
pnpm --filter @vibetech/memory build

# Build MCP server
pnpm --filter memory-mcp build

# Start MCP server (via MCP config)
node C:\dev\apps\memory-mcp\dist\index.js
```

### 10.2 MCP Configuration

**.mcp.json**:
```json
{
  "mcpServers": {
    "memory-system": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\dev\\apps\\memory-mcp\\dist\\index.js"],
      "env": {
        "MEMORY_DB_PATH": "D:\\databases\\memory.db",
        "EMBEDDING_PROVIDER": "ollama",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "EMBEDDING_DIMENSIONS": "768",
        "LOG_PATH": "D:\\logs\\memory-system",
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "HTTP_API_ENABLED": "true",
        "HTTP_API_PORT": "3333"
      }
    }
  }
}
```

### 10.3 Health Monitoring

**Scheduled Task**: Daily at 3:00 AM

```powershell
# C:\dev\scripts\memory-health-check.ps1

# Check DB accessibility
Test-Path "D:\databases\memory.db"

# Check WAL size
$walSize = (Get-Item "D:\databases\memory.db-wal").Length / 1MB
if ($walSize -gt 100) {
    # Checkpoint WAL
    sqlite3 "D:\databases\memory.db" "PRAGMA wal_checkpoint(TRUNCATE);"
}

# Check disk space
$drive = Get-PSDrive D
$freePercent = ($drive.Free / $drive.Used) * 100
if ($freePercent -lt 20) {
    Write-Warning "Low disk space on D:\ ($freePercent% free)"
}

# Log health status
$health = @{
    timestamp = Get-Date -Format "o"
    dbSize = (Get-Item "D:\databases\memory.db").Length
    walSize = $walSize
    freeSpace = $freePercent
} | ConvertTo-Json

$health | Out-File "D:\health\memory-system.json"
```

---

## Appendix A: Technology Decisions

| Decision | Chosen Option | Rationale |
|----------|---------------|-----------|
| Vector DB | sqlite-vec | Reuses existing SQLite infrastructure, no new service needed |
| Embeddings | Ollama + Transformers.js | Local, private, free. Dual fallback for resilience |
| Embedding Model | nomic-embed-text (768d) | Best open-source quality, 8K context window |
| Storage Location | D:\databases\ | Per workspace path policy, separates code from data |
| Memory Architecture | 3-tier (working/episodic-semantic/procedural) | Industry standard (MemGPT, enterprise agents) |
| MCP Transport | stdio | Standard for local MCP servers |
| Hook Mechanism | HTTP fire-and-forget | Non-blocking, resilient, <30ms latency |

---

**End of Architecture Document**
