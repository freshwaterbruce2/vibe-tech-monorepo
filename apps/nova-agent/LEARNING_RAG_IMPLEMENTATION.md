# Nova-Agent RAG Implementation Details

**Status:** Active Production
**Last Updated:** 2026-01-25
**Learning Database:** `D:\databases\nova_shared.db`

---

## Overview

Nova-Agent leverages Retrieval-Augmented Generation (RAG) to provide context-aware responses by querying the monorepo learning system. This document details the RAG implementation, query strategies, and optimization techniques.

## Architecture

```
┌─────────────────┐
│   User Query    │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│  Nova-Agent Query Processor     │
│  - Extract intent               │
│  - Identify keywords            │
│  - Determine context            │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  Learning Database Query        │
│  - agent_knowledge (curated)    │
│  - code_patterns (19,974)       │
│  - task_patterns (proven)       │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  Context Ranking & Filtering    │
│  - Relevance scoring            │
│  - Confidence thresholding      │
│  - Top-K selection              │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  Prompt Augmentation            │
│  - Inject retrieved context     │
│  - Format for LLM               │
│  - Add examples                 │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  LLM Response Generation        │
│  - Context-aware answer         │
│  - Code suggestions             │
│  - Best practice recommendations│
└─────────────────────────────────┘
```

## Database Connection

### Connection Setup

**Location:** `apps/nova-agent/src/services/learning-db.ts`

```typescript
import Database from 'better-sqlite3';
import { join } from 'path';

export class LearningDatabaseService {
  private db: Database.Database;
  private readonly DB_PATH = 'D:\\databases\\nova_shared.db';

  constructor() {
    this.db = new Database(this.DB_PATH, {
      readonly: true, // RAG only reads, never writes
      fileMustExist: true,
    });

    // Optimize for read performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');

    // Prepare common queries
    this.prepareStatements();
  }

  private prepareStatements() {
    // Cache prepared statements for performance
    this.queries = {
      searchKnowledge: this.db.prepare(`
        SELECT title, content, category, confidence_score, access_count
        FROM agent_knowledge
        WHERE category LIKE ?
          OR title LIKE ?
          OR content LIKE ?
        ORDER BY confidence_score DESC, access_count DESC
        LIMIT ?
      `),

      searchCodePatterns: this.db.prepare(`
        SELECT pattern_name, code_language, code_snippet, description, use_cases, success_rate
        FROM code_patterns
        WHERE pattern_type LIKE ?
          OR code_language = ?
          OR use_cases LIKE ?
        ORDER BY success_rate DESC, usage_count DESC
        LIMIT ?
      `),

      searchTaskPatterns: this.db.prepare(`
        SELECT pattern_name, task_type, approach_description, tools_used, success_rate
        FROM task_patterns
        WHERE task_type LIKE ?
          OR pattern_name LIKE ?
        ORDER BY success_rate DESC, usage_count DESC
        LIMIT ?
      `),

      getRecentMistakes: this.db.prepare(`
        SELECT mistake_type, description, prevention_strategy, recurrence_count
        FROM agent_mistakes
        WHERE mistake_category LIKE ?
        ORDER BY recurrence_count DESC, last_occurred DESC
        LIMIT ?
      `),
    };
  }

  public close() {
    this.db.close();
  }
}
```

## RAG Query Strategies

### 1. Intent-Based Knowledge Retrieval

**Purpose:** Match user intent to curated knowledge entries

**Implementation:**

```typescript
interface KnowledgeQueryParams {
  keywords: string[];
  category?: string;
  minConfidence?: number;
  limit?: number;
}

export class RAGService {
  constructor(private learningDb: LearningDatabaseService) {}

  async retrieveKnowledge(params: KnowledgeQueryParams): Promise<KnowledgeEntry[]> {
    const {
      keywords,
      category = '%',
      minConfidence = 0.7,
      limit = 5,
    } = params;

    // Build search query
    const searchPattern = `%${keywords.join('%')}%`;

    const results = this.learningDb.queries.searchKnowledge.all(
      `%${category}%`,
      searchPattern,
      searchPattern,
      limit
    );

    // Filter by confidence threshold
    return results.filter(r => r.confidence_score >= minConfidence);
  }
}
```

**Example Usage:**

```typescript
// User asks: "How do I integrate with Kraken API?"
const knowledge = await ragService.retrieveKnowledge({
  keywords: ['kraken', 'api', 'integration'],
  category: 'crypto',
  minConfidence: 0.8,
  limit: 3,
});

// Retrieved knowledge:
// 1. "Kraken API Best Practices" (confidence: 0.95)
// 2. "WebSocket V2 Integration Guide" (confidence: 0.92)
// 3. "Nonce Synchronization Pattern" (confidence: 0.88)
```

### 2. Code Pattern Search

**Purpose:** Find reusable code snippets for specific use cases

**Implementation:**

```typescript
interface CodePatternQueryParams {
  language?: string;
  patternType?: string;
  useCase?: string;
  minSuccessRate?: number;
  limit?: number;
}

async searchCodePatterns(params: CodePatternQueryParams): Promise<CodePattern[]> {
  const {
    language = '%',
    patternType = '%',
    useCase = '%',
    minSuccessRate = 0.8,
    limit = 5,
  } = params;

  const results = this.learningDb.queries.searchCodePatterns.all(
    `%${patternType}%`,
    language,
    `%${useCase}%`,
    limit
  );

  return results.filter(r => r.success_rate >= minSuccessRate);
}
```

**Example Usage:**

```typescript
// User asks: "Show me TypeScript database connection pattern"
const patterns = await ragService.searchCodePatterns({
  language: 'typescript',
  patternType: 'database',
  useCase: 'connection',
  minSuccessRate: 0.9,
});

// Retrieved patterns:
// 1. "SQLite Connection with WAL Mode" (success: 97%)
// 2. "Database Connection Pool" (success: 95%)
```

### 3. Task Pattern Recommendations

**Purpose:** Suggest proven approaches for high-level tasks

**Implementation:**

```typescript
interface TaskPatternQueryParams {
  taskType: string;
  keywords?: string[];
  minSuccessRate?: number;
  limit?: number;
}

async recommendTaskApproach(params: TaskPatternQueryParams): Promise<TaskPattern[]> {
  const {
    taskType,
    keywords = [],
    minSuccessRate = 0.8,
    limit = 3,
  } = params;

  const searchPattern = keywords.length > 0 ? `%${keywords.join('%')}%` : '%';

  const results = this.learningDb.queries.searchTaskPatterns.all(
    `%${taskType}%`,
    searchPattern,
    limit
  );

  return results.filter(r => r.success_rate >= minSuccessRate);
}
```

**Example Usage:**

```typescript
// User asks: "How should I approach API integration testing?"
const approaches = await ragService.recommendTaskApproach({
  taskType: 'api_integration',
  keywords: ['testing'],
  minSuccessRate: 0.85,
});

// Retrieved approaches:
// 1. "Parallel API Testing with Connection Pool" (success: 99%)
// 2. "Mock-then-Live Testing Strategy" (success: 92%)
```

### 4. Mistake Prevention

**Purpose:** Warn users about common pitfalls before they occur

**Implementation:**

```typescript
interface MistakeQueryParams {
  category: string;
  minRecurrenceCount?: number;
  limit?: number;
}

async checkForKnownMistakes(params: MistakeQueryParams): Promise<Mistake[]> {
  const {
    category,
    minRecurrenceCount = 2,
    limit = 5,
  } = params;

  const results = this.learningDb.queries.getRecentMistakes.all(
    `%${category}%`,
    limit
  );

  return results.filter(m => m.recurrence_count >= minRecurrenceCount);
}
```

**Example Usage:**

```typescript
// User says: "I'm going to connect to WebSocket without validation"
const mistakes = await ragService.checkForKnownMistakes({
  category: 'websocket',
  minRecurrenceCount: 3,
});

// Retrieved mistakes:
// 1. "'KrakenWebSocketUnified' object has no attribute 'subscribe_to_ticker'"
//    Prevention: "Always validate WebSocket object before method calls"
//    Occurrences: 15 times
```

## Context Ranking & Filtering

### Relevance Scoring

**Algorithm:**

```typescript
interface ScoredContext {
  content: string;
  relevanceScore: number;
  source: 'knowledge' | 'code_pattern' | 'task_pattern';
  metadata: Record<string, any>;
}

class ContextRanker {
  scoreContext(query: string, candidate: any, type: string): number {
    let score = 0;

    // Keyword matching (40% weight)
    score += this.keywordMatchScore(query, candidate) * 0.4;

    // Confidence/Success rate (30% weight)
    const confidenceField = type === 'knowledge' ? 'confidence_score' : 'success_rate';
    score += (candidate[confidenceField] || 0) * 0.3;

    // Usage popularity (20% weight)
    const usageField = type === 'knowledge' ? 'access_count' : 'usage_count';
    score += this.normalizeUsage(candidate[usageField] || 0) * 0.2;

    // Recency (10% weight)
    score += this.recencyScore(candidate.updated_at || candidate.created_at) * 0.1;

    return score;
  }

  private keywordMatchScore(query: string, candidate: any): number {
    const queryTokens = query.toLowerCase().split(/\s+/);
    const candidateText = JSON.stringify(candidate).toLowerCase();

    const matches = queryTokens.filter(token => candidateText.includes(token));
    return matches.length / queryTokens.length;
  }

  private normalizeUsage(count: number): number {
    // Logarithmic scaling for usage count
    return Math.min(Math.log10(count + 1) / 4, 1.0);
  }

  private recencyScore(timestamp: string): number {
    const age = Date.now() - new Date(timestamp).getTime();
    const daysSince = age / (1000 * 60 * 60 * 24);

    // Exponential decay: newer = higher score
    return Math.exp(-daysSince / 90); // 90-day half-life
  }
}
```

### Context Filtering

```typescript
interface FilterCriteria {
  minRelevanceScore?: number;
  maxResults?: number;
  requireExamples?: boolean;
  preferredSources?: string[];
}

class ContextFilter {
  filter(contexts: ScoredContext[], criteria: FilterCriteria): ScoredContext[] {
    let filtered = contexts;

    // Minimum relevance threshold
    if (criteria.minRelevanceScore) {
      filtered = filtered.filter(c => c.relevanceScore >= criteria.minRelevanceScore);
    }

    // Require code examples if specified
    if (criteria.requireExamples) {
      filtered = filtered.filter(c =>
        c.source === 'code_pattern' ||
        c.metadata.hasExamples === true
      );
    }

    // Prefer specific sources
    if (criteria.preferredSources) {
      filtered.sort((a, b) => {
        const aPreferred = criteria.preferredSources!.includes(a.source);
        const bPreferred = criteria.preferredSources!.includes(b.source);
        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;
        return b.relevanceScore - a.relevanceScore;
      });
    } else {
      // Default: sort by relevance
      filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Limit results
    if (criteria.maxResults) {
      filtered = filtered.slice(0, criteria.maxResults);
    }

    return filtered;
  }
}
```

## Prompt Augmentation

### Context Injection

**Template:**

```typescript
interface PromptTemplate {
  systemPrompt: string;
  contextSection: string;
  userQuery: string;
}

class PromptBuilder {
  buildAugmentedPrompt(
    query: string,
    contexts: ScoredContext[]
  ): PromptTemplate {
    // System prompt with RAG instructions
    const systemPrompt = `
You are Nova-Agent, an AI assistant with access to the VibeTech monorepo learning system.
You have been provided with relevant context from 59,014+ execution records and 19,974 code patterns.

Use this context to provide accurate, proven solutions based on real-world data.
When suggesting code, prefer patterns with high success rates (≥80%).
Warn users about known mistakes to prevent errors.
`;

    // Format retrieved contexts
    const contextSection = this.formatContexts(contexts);

    return {
      systemPrompt,
      contextSection,
      userQuery: query,
    };
  }

  private formatContexts(contexts: ScoredContext[]): string {
    if (contexts.length === 0) {
      return 'No relevant context found in learning database.';
    }

    let formatted = '## Relevant Context from Learning System\n\n';

    contexts.forEach((ctx, idx) => {
      formatted += `### ${idx + 1}. ${ctx.metadata.title || ctx.source}\n`;
      formatted += `**Source:** ${ctx.source}\n`;
      formatted += `**Relevance:** ${(ctx.relevanceScore * 100).toFixed(0)}%\n`;

      if (ctx.source === 'code_pattern') {
        formatted += `**Success Rate:** ${(ctx.metadata.success_rate * 100).toFixed(0)}%\n`;
        formatted += `**Language:** ${ctx.metadata.code_language}\n\n`;
        formatted += '```' + ctx.metadata.code_language + '\n';
        formatted += ctx.content + '\n';
        formatted += '```\n\n';
      } else if (ctx.source === 'knowledge') {
        formatted += `**Confidence:** ${(ctx.metadata.confidence_score * 100).toFixed(0)}%\n\n`;
        formatted += ctx.content + '\n\n';
      } else if (ctx.source === 'task_pattern') {
        formatted += `**Success Rate:** ${(ctx.metadata.success_rate * 100).toFixed(0)}%\n`;
        formatted += `**Approach:** ${ctx.content}\n\n`;
      }

      formatted += '---\n\n';
    });

    return formatted;
  }
}
```

### Example Augmented Prompt

**User Query:** "How do I connect to Kraken WebSocket?"

**Augmented Prompt:**

```
SYSTEM:
You are Nova-Agent, an AI assistant with access to the VibeTech monorepo learning system.
You have been provided with relevant context from 59,014+ execution records and 19,974 code patterns.

Use this context to provide accurate, proven solutions based on real-world data.
When suggesting code, prefer patterns with high success rates (≥80%).
Warn users about known mistakes to prevent errors.

## Relevant Context from Learning System

### 1. Kraken WebSocket V2 Integration
**Source:** code_pattern
**Relevance:** 95%
**Success Rate:** 97%
**Language:** typescript

```typescript
// Proven pattern from crypto-enhanced
class WebSocketManager {
  async start() {
    const token = await this._get_ws_token();
    await this._connect(token);
    await this._subscribe_channels();
    asyncio.create_task(this._heartbeat_monitor());
  }

  private _validate_websocket(ws_obj, operation: string): boolean {
    if (!ws_obj) return false;
    // Check for required methods
    return typeof ws_obj.send === 'function';
  }
}
```

---

### 2. Known Mistake: WebSocket Validation
**Source:** agent_mistakes
**Relevance:** 90%
**Recurrence Count:** 15

**Mistake:** 'KrakenWebSocketUnified' object has no attribute 'subscribe_to_ticker'
**Prevention:** Always validate WebSocket object before calling methods

---

USER:
How do I connect to Kraken WebSocket?
```

## Performance Optimizations

### 1. Query Caching

```typescript
import NodeCache from 'node-cache';

class CachedRAGService extends RAGService {
  private cache: NodeCache;

  constructor(learningDb: LearningDatabaseService) {
    super(learningDb);
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60,
      useClones: false, // Performance optimization
    });
  }

  async retrieveKnowledge(params: KnowledgeQueryParams): Promise<KnowledgeEntry[]> {
    const cacheKey = `knowledge_${JSON.stringify(params)}`;
    const cached = this.cache.get<KnowledgeEntry[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const results = await super.retrieveKnowledge(params);
    this.cache.set(cacheKey, results);
    return results;
  }
}
```

### 2. Connection Pooling

```typescript
class LearningDatabasePool {
  private connections: Database.Database[] = [];
  private readonly POOL_SIZE = 5;

  constructor() {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.connections.push(new Database('D:\\databases\\nova_shared.db', {
        readonly: true,
        fileMustExist: true,
      }));
    }
  }

  async withConnection<T>(callback: (db: Database.Database) => T): Promise<T> {
    // Round-robin connection selection
    const db = this.connections[Math.floor(Math.random() * this.POOL_SIZE)];
    return callback(db);
  }
}
```

### 3. Parallel Queries

```typescript
async retrieveAllContext(query: string): Promise<ScoredContext[]> {
  const [knowledge, codePatterns, taskPatterns, mistakes] = await Promise.all([
    this.retrieveKnowledge({ keywords: query.split(/\s+/), limit: 5 }),
    this.searchCodePatterns({ useCase: query, limit: 3 }),
    this.recommendTaskApproach({ taskType: query, limit: 3 }),
    this.checkForKnownMistakes({ category: query, limit: 3 }),
  ]);

  return [
    ...knowledge.map(k => this.toScoredContext(k, 'knowledge')),
    ...codePatterns.map(p => this.toScoredContext(p, 'code_pattern')),
    ...taskPatterns.map(t => this.toScoredContext(t, 'task_pattern')),
    ...mistakes.map(m => this.toScoredContext(m, 'mistake')),
  ];
}
```

## Monitoring & Analytics

### RAG Performance Metrics

```typescript
interface RAGMetrics {
  queriesExecuted: number;
  avgQueryTime: number;
  cacheHitRate: number;
  avgContextsRetrieved: number;
  avgRelevanceScore: number;
}

class RAGMonitor {
  private metrics: RAGMetrics = {
    queriesExecuted: 0,
    avgQueryTime: 0,
    cacheHitRate: 0,
    avgContextsRetrieved: 0,
    avgRelevanceScore: 0,
  };

  recordQuery(duration: number, contextsCount: number, avgScore: number, cacheHit: boolean) {
    this.metrics.queriesExecuted++;
    this.metrics.avgQueryTime = this.updateAverage(this.metrics.avgQueryTime, duration);
    this.metrics.avgContextsRetrieved = this.updateAverage(this.metrics.avgContextsRetrieved, contextsCount);
    this.metrics.avgRelevanceScore = this.updateAverage(this.metrics.avgRelevanceScore, avgScore);

    if (cacheHit) {
      this.metrics.cacheHitRate = this.updateAverage(this.metrics.cacheHitRate, 1);
    } else {
      this.metrics.cacheHitRate = this.updateAverage(this.metrics.cacheHitRate, 0);
    }
  }

  private updateAverage(current: number, newValue: number): number {
    const n = this.metrics.queriesExecuted;
    return (current * (n - 1) + newValue) / n;
  }

  getMetrics(): RAGMetrics {
    return { ...this.metrics };
  }
}
```

### Logging

```typescript
import winston from 'winston';

const ragLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'D:\\logs\\nova-agent-rag.log',
    }),
  ],
});

// Log RAG queries
ragLogger.info('RAG query executed', {
  query: userQuery,
  contextsRetrieved: contexts.length,
  avgRelevance: avgRelevanceScore,
  queryTime: duration,
  cacheHit: wasFromCache,
});
```

## Testing RAG Integration

### Unit Tests

**Location:** `apps/nova-agent/src/services/__tests__/rag-service.test.ts`

```typescript
import { RAGService } from '../rag-service';
import { LearningDatabaseService } from '../learning-db';

describe('RAGService', () => {
  let ragService: RAGService;

  beforeAll(() => {
    const db = new LearningDatabaseService();
    ragService = new RAGService(db);
  });

  test('retrieves relevant knowledge for crypto queries', async () => {
    const results = await ragService.retrieveKnowledge({
      keywords: ['kraken', 'api'],
      category: 'crypto',
      minConfidence: 0.8,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].confidence_score).toBeGreaterThanOrEqual(0.8);
    expect(results[0].category).toContain('crypto');
  });

  test('finds high-success code patterns', async () => {
    const patterns = await ragService.searchCodePatterns({
      language: 'typescript',
      minSuccessRate: 0.9,
    });

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].success_rate).toBeGreaterThanOrEqual(0.9);
  });

  test('warns about known mistakes', async () => {
    const mistakes = await ragService.checkForKnownMistakes({
      category: 'websocket',
      minRecurrenceCount: 2,
    });

    expect(mistakes.length).toBeGreaterThan(0);
    expect(mistakes[0].recurrence_count).toBeGreaterThanOrEqual(2);
    expect(mistakes[0].prevention_strategy).toBeTruthy();
  });
});
```

### Integration Tests

```typescript
describe('RAG Integration', () => {
  test('end-to-end RAG workflow', async () => {
    const query = 'How do I connect to Kraken WebSocket?';

    // 1. Retrieve contexts
    const contexts = await ragService.retrieveAllContext(query);
    expect(contexts.length).toBeGreaterThan(0);

    // 2. Rank and filter
    const ranker = new ContextRanker();
    const scored = contexts.map(c => ({
      ...c,
      relevanceScore: ranker.scoreContext(query, c.metadata, c.source),
    }));

    // 3. Filter
    const filter = new ContextFilter();
    const filtered = filter.filter(scored, {
      minRelevanceScore: 0.5,
      maxResults: 5,
    });

    expect(filtered.length).toBeLessThanOrEqual(5);
    expect(filtered[0].relevanceScore).toBeGreaterThanOrEqual(0.5);

    // 4. Build prompt
    const promptBuilder = new PromptBuilder();
    const prompt = promptBuilder.buildAugmentedPrompt(query, filtered);

    expect(prompt.contextSection).toContain('Relevant Context');
    expect(prompt.systemPrompt).toContain('Nova-Agent');
  });
});
```

## Usage Examples

### Example 1: User Asks Technical Question

```typescript
// User: "How should I handle database connections in TypeScript?"

const contexts = await ragService.retrieveAllContext('database connections typescript');

const filtered = contextFilter.filter(
  contexts.map(c => ({ ...c, relevanceScore: ranker.scoreContext(query, c.metadata, c.source) })),
  { minRelevanceScore: 0.6, maxResults: 3, preferredSources: ['code_pattern'] }
);

const prompt = promptBuilder.buildAugmentedPrompt(query, filtered);

// Response includes:
// - SQLite connection pattern (97% success)
// - WAL mode configuration (best practice)
// - Connection cleanup on exit (critical)
```

### Example 2: User About to Make Mistake

```typescript
// User: "I'm going to place a Kraken order without validation"

const mistakes = await ragService.checkForKnownMistakes({
  category: 'kraken',
  minRecurrenceCount: 2,
});

// System warns:
// "⚠️ Known Issue: Order placement without WebSocket validation
//  Occurrences: 15 times
//  Prevention: Always validate WebSocket object before add_order()"
```

## Related Documentation

- **Learning System:** `docs/LEARNING_SYSTEM.md`
- **Database Schema:** `.claude/plugins/monorepo-automation/skills/learning-integration/references/learning-system-schema.md`
- **Nova-Agent Architecture:** `apps/nova-agent/docs/architecture/system_architecture.md`

---

**Status:** ✅ Active Production
**Query Performance:** <50ms avg (with caching)
**Cache Hit Rate:** ~65%
**Contexts Retrieved:** 3-5 avg per query
**Relevance Score:** 0.75 avg
