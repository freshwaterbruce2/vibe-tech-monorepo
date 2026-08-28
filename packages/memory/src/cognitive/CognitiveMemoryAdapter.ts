import type Database from 'better-sqlite3';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import { cosineSimilarity, deserializeEmbedding } from '../utils/math.js';

export type CognitiveMemoryKind = 'outcome' | 'anti_pattern';

export interface CognitiveScoringWeights {
  semanticSimilarity: number;
  baseLevelActivation: number;
  successRate: number;
  confidence: number;
}

export interface CognitiveMemoryRecord {
  id: number;
  kind: CognitiveMemoryKind;
  task: string;
  summary: string;
  context?: string;
  recommendation?: string;
  embedding: number[];
  embeddingModel?: string;
  createdAt: number;
  lastAccessed?: number;
  accessCount: number;
  successCount: number;
  failureCount: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface StoreOutcomeInput {
  task: string;
  outcome: string;
  context?: string;
  successful?: boolean;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface StoreAntiPatternInput {
  task: string;
  antiPattern: string;
  context?: string;
  recommendation?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface CognitiveRetrievalOptions {
  limit?: number;
  kind?: CognitiveMemoryKind;
  minScore?: number;
  updateAccess?: boolean;
  halfLifeMs?: number;
  weights?: Partial<CognitiveScoringWeights>;
}

export interface CognitiveScoreComponents {
  semanticSimilarity: number;
  baseLevelActivation: number;
  successRate: number;
  rawSuccessRate: number;
  confidence: number;
}

export interface CognitiveSearchResult {
  record: CognitiveMemoryRecord;
  score: number;
  distance: number;
  components: CognitiveScoreComponents;
}

interface CognitiveMemoryRow {
  id: number;
  kind: CognitiveMemoryKind;
  task: string;
  summary: string;
  context: string | null;
  recommendation: string | null;
  embedding: Buffer;
  embedding_model: string | null;
  created_at: number;
  last_accessed: number | null;
  access_count: number;
  success_count: number;
  failure_count: number;
  confidence: number;
  metadata: string | null;
}

const DEFAULT_HALF_LIFE_MS = 21 * 24 * 60 * 60 * 1000;

const DEFAULT_WEIGHTS: CognitiveScoringWeights = {
  semanticSimilarity: 0.5,
  baseLevelActivation: 0.2,
  successRate: 0.2,
  confidence: 0.1,
};

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizeWeights(weights?: Partial<CognitiveScoringWeights>): CognitiveScoringWeights {
  const merged = {
    ...DEFAULT_WEIGHTS,
    ...weights,
  };

  const raw = {
    semanticSimilarity: Math.max(0, merged.semanticSimilarity),
    baseLevelActivation: Math.max(0, merged.baseLevelActivation),
    successRate: Math.max(0, merged.successRate),
    confidence: Math.max(0, merged.confidence),
  };

  const total =
    raw.semanticSimilarity + raw.baseLevelActivation + raw.successRate + raw.confidence;
  if (total <= 0) return DEFAULT_WEIGHTS;

  return {
    semanticSimilarity: raw.semanticSimilarity / total,
    baseLevelActivation: raw.baseLevelActivation / total,
    successRate: raw.successRate / total,
    confidence: raw.confidence / total,
  };
}

export class CognitiveMemoryAdapter {
  constructor(
    private db: Database.Database,
    private embedder: EmbeddingService,
  ) {}

  async storeOutcome(input: StoreOutcomeInput): Promise<number> {
    const successful = input.successful ?? true;
    return this.insertRecord({
      kind: 'outcome',
      task: input.task,
      summary: input.outcome,
      context: input.context,
      recommendation: undefined,
      successCount: successful ? 1 : 0,
      failureCount: successful ? 0 : 1,
      confidence: input.confidence ?? 0.7,
      metadata: input.metadata,
    });
  }

  async storeAntiPattern(input: StoreAntiPatternInput): Promise<number> {
    return this.insertRecord({
      kind: 'anti_pattern',
      task: input.task,
      summary: input.antiPattern,
      context: input.context,
      recommendation: input.recommendation,
      successCount: 0,
      failureCount: 1,
      confidence: input.confidence ?? 0.8,
      metadata: input.metadata,
    });
  }

  async retrieve(
    query: string,
    options: CognitiveRetrievalOptions = {},
  ): Promise<CognitiveSearchResult[]> {
    const limit = options.limit ?? 5;
    const queryEmbedding = await this.embedder.embed(query);
    const rows = this.loadCandidateRows(options.kind, Math.max(limit * 20, 1000));
    const weights = normalizeWeights(options.weights);
    const now = Date.now();
    const halfLifeMs = options.halfLifeMs ?? DEFAULT_HALF_LIFE_MS;

    const results: CognitiveSearchResult[] = [];
    for (const row of rows) {
      if (row.embedding_model && row.embedding_model !== this.embedder.getModel()) {
        continue;
      }

      const embedding = deserializeEmbedding(row.embedding);
      if (embedding.length !== queryEmbedding.length) {
        continue;
      }

      const record = this.mapRow(row, embedding);
      const components = this.calculateComponents(record, queryEmbedding, now, halfLifeMs);
      const score =
        components.semanticSimilarity * weights.semanticSimilarity +
        components.baseLevelActivation * weights.baseLevelActivation +
        components.successRate * weights.successRate +
        components.confidence * weights.confidence;

      if (options.minScore !== undefined && score < options.minScore) {
        continue;
      }

      results.push({
        record,
        score: roundScore(score),
        distance: roundScore(1 - score),
        components,
      });
    }

    results.sort((a, b) => b.score - a.score);
    const sliced = results.slice(0, limit);

    if (options.updateAccess !== false) {
      this.reinforceAccess(sliced.map((result) => result.record.id));
    }

    return sliced;
  }

  getById(id: number): CognitiveMemoryRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, kind, task, summary, context, recommendation, embedding, embedding_model,
                created_at, last_accessed, access_count, success_count, failure_count,
                confidence, metadata
         FROM cognitive_memory
         WHERE id = ?`,
      )
      .get(id) as CognitiveMemoryRow | undefined;

    if (!row) return null;
    return this.mapRow(row, deserializeEmbedding(row.embedding));
  }

  count(kind?: CognitiveMemoryKind): number {
    if (kind) {
      const row = this.db
        .prepare('SELECT COUNT(*) as count FROM cognitive_memory WHERE kind = ?')
        .get(kind) as { count: number };
      return row.count;
    }

    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM cognitive_memory')
      .get() as { count: number };
    return row.count;
  }

  private async insertRecord(input: {
    kind: CognitiveMemoryKind;
    task: string;
    summary: string;
    context?: string;
    recommendation?: string;
    successCount: number;
    failureCount: number;
    confidence: number;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    const text = this.buildEmbeddingText(input);
    const embedding = await this.embedder.embed(text);
    const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);
    const now = Date.now();

    const result = this.db
      .prepare(
        `INSERT INTO cognitive_memory (
           kind, task, summary, context, recommendation, embedding, embedding_model,
           created_at, access_count, success_count, failure_count, confidence, metadata
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .run(
        input.kind,
        input.task,
        input.summary,
        input.context ?? null,
        input.recommendation ?? null,
        embeddingBlob,
        this.embedder.getModel(),
        now,
        input.successCount,
        input.failureCount,
        clamp(input.confidence),
        input.metadata ? JSON.stringify(input.metadata) : null,
      );

    return result.lastInsertRowid as number;
  }

  private loadCandidateRows(
    kind: CognitiveMemoryKind | undefined,
    scanLimit: number,
  ): CognitiveMemoryRow[] {
    const baseQuery = `
      SELECT id, kind, task, summary, context, recommendation, embedding, embedding_model,
             created_at, last_accessed, access_count, success_count, failure_count,
             confidence, metadata
      FROM cognitive_memory
      WHERE length(embedding) > 0
    `;

    if (kind) {
      return this.db
        .prepare(`${baseQuery} AND kind = ? ORDER BY created_at DESC LIMIT ?`)
        .all(kind, scanLimit) as CognitiveMemoryRow[];
    }

    return this.db
      .prepare(`${baseQuery} ORDER BY created_at DESC LIMIT ?`)
      .all(scanLimit) as CognitiveMemoryRow[];
  }

  private calculateComponents(
    record: CognitiveMemoryRecord,
    queryEmbedding: number[],
    now: number,
    halfLifeMs: number,
  ): CognitiveScoreComponents {
    const semanticSimilarity = clamp(cosineSimilarity(queryEmbedding, record.embedding));
    const lastReinforcedAt = record.lastAccessed ?? record.createdAt;
    const ageMs = Math.max(0, now - lastReinforcedAt);
    const decay = Math.pow(2, -(ageMs / halfLifeMs));
    const frequency = clamp(Math.log1p(record.accessCount) / Math.log1p(20));
    const baseLevelActivation = clamp(decay * 0.75 + frequency * 0.25);
    const totalOutcomes = record.successCount + record.failureCount;
    const rawSuccessRate = totalOutcomes === 0 ? 0.5 : record.successCount / totalOutcomes;
    const successRate =
      record.kind === 'anti_pattern' ? 1 - rawSuccessRate : rawSuccessRate;

    return {
      semanticSimilarity: roundScore(semanticSimilarity),
      baseLevelActivation: roundScore(baseLevelActivation),
      successRate: roundScore(successRate),
      rawSuccessRate: roundScore(rawSuccessRate),
      confidence: roundScore(clamp(record.confidence)),
    };
  }

  private reinforceAccess(ids: number[]): void {
    if (ids.length === 0) return;

    const update = this.db.prepare(
      `UPDATE cognitive_memory
       SET last_accessed = ?, access_count = access_count + 1
       WHERE id = ?`,
    );
    const touchAll = this.db.transaction((rowIds: number[]) => {
      const now = Date.now();
      for (const id of rowIds) {
        update.run(now, id);
      }
    });

    touchAll(ids);
  }

  private mapRow(row: CognitiveMemoryRow, embedding: number[]): CognitiveMemoryRecord {
    return {
      id: row.id,
      kind: row.kind,
      task: row.task,
      summary: row.summary,
      context: row.context ?? undefined,
      recommendation: row.recommendation ?? undefined,
      embedding,
      embeddingModel: row.embedding_model ?? undefined,
      createdAt: row.created_at,
      lastAccessed: row.last_accessed ?? undefined,
      accessCount: row.access_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      confidence: row.confidence,
      metadata: this.parseMetadata(row.metadata),
    };
  }

  private parseMetadata(metadataJson: string | null): Record<string, unknown> | undefined {
    if (!metadataJson) return undefined;

    try {
      const parsed = JSON.parse(metadataJson) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private buildEmbeddingText(input: {
    kind: CognitiveMemoryKind;
    task: string;
    summary: string;
    context?: string;
    recommendation?: string;
  }): string {
    const label = input.kind === 'anti_pattern' ? 'Anti-pattern' : 'Outcome';
    const parts = [`${label}: ${input.summary}`, `Task: ${input.task}`];
    if (input.context) parts.push(`Context: ${input.context}`);
    if (input.recommendation) parts.push(`Recommendation: ${input.recommendation}`);
    return parts.join('\n');
  }
}
