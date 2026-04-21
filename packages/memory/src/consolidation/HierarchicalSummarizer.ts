/**
 * Hierarchical Summarization System
 *
 * Converts raw episodic memories into multi-level semantic summaries:
 *   Level 0 (Episodes):  Individual interactions (raw data)
 *   Level 1 (Sessions):  Groups of related episodes → session summaries
 *   Level 2 (Topics):    Cross-session patterns    → topic knowledge
 *   Level 3 (Domains):   High-level domain wisdom  → strategic insights
 *
 * Each higher level distills and compresses the level below, creating
 * a pyramid where the most abstract/useful knowledge rises to the top.
 */

import type Database from 'better-sqlite3';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import type { EpisodicMemory } from '../types/index.js';

// ── Interfaces ──────────────────────────────────────────────

export interface SummaryLevel {
  level: number;
  label: string;
  text: string;
  sourceIds: number[];
  importance: number;
  metadata: Record<string, unknown>;
}

export interface SummarizationResult {
  sessionsCreated: number;
  topicsCreated: number;
  domainsCreated: number;
  totalEpisodesProcessed: number;
}

export interface SummarizerConfig {
  /** Minimum episodes per session group (default: 3) */
  minSessionSize?: number;
  /** Time window for session grouping in ms (default: 2 hours) */
  sessionWindowMs?: number;
  /** Minimum sessions before topic extraction (default: 2) */
  minTopicSessions?: number;
  /** Custom summarizer function (default: extractive) */
  summarizeFn?: (texts: string[]) => string;
  /** Optional embedding service for real vector generation */
  embedder?: EmbeddingService;
}

interface EpisodicRow {
  id: number;
  source_id: string;
  timestamp: number;
  query: string;
  response: string;
  session_id: string | null;
  metadata: string | null;
}

// ── Default Extractive Summarizer ───────────────────────────

function extractiveSummarize(texts: string[]): string {
  if (texts.length === 0) return '';
  if (texts.length === 1) return texts[0];

  // Pick distinct sentences, preferring shorter (more informative) ones
  const sentences = texts
    .flatMap((t) => t.split(/[.!?]+/).map((s) => s.trim()))
    .filter((s) => s.length > 15 && s.length < 300);

  // Deduplicate by lowercase prefix
  const seen = new Set<string>();
  const unique = sentences.filter((s) => {
    const key = s.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Take top-N shortest-but-substantive sentences
  const selected = unique.sort((a, b) => a.length - b.length).slice(0, Math.min(5, unique.length));

  return selected.join('. ') + '.';
}

// ── HierarchicalSummarizer ──────────────────────────────────

export class HierarchicalSummarizer {
  private minSessionSize: number;
  private sessionWindowMs: number;
  private minTopicSessions: number;
  private summarize: (texts: string[]) => string;
  private embedder?: EmbeddingService;

  constructor(config: SummarizerConfig = {}) {
    this.minSessionSize = config.minSessionSize ?? 3;
    this.sessionWindowMs = config.sessionWindowMs ?? 2 * 60 * 60 * 1000;
    this.minTopicSessions = config.minTopicSessions ?? 2;
    this.summarize = config.summarizeFn ?? extractiveSummarize;
    this.embedder = config.embedder;
  }

  /**
   * Run full hierarchical summarization pipeline.
   * Reads episodic memories, groups into sessions, extracts topics,
   * then stores results as semantic memories at different importance levels.
   */
  async run(db: Database.Database): Promise<SummarizationResult> {
    const episodes = this.loadEpisodes(db);
    if (episodes.length < this.minSessionSize) {
      return { sessionsCreated: 0, topicsCreated: 0, domainsCreated: 0, totalEpisodesProcessed: 0 };
    }

    // Level 1: Group episodes into sessions
    const sessions = this.groupIntoSessions(episodes);
    const validSessions = sessions.filter((s) => s.length >= this.minSessionSize);
    const sessionSummaries = this.summarizeSessions(validSessions);

    // Level 2: Extract cross-session topics
    const topics =
      sessionSummaries.length >= this.minTopicSessions ? this.extractTopics(sessionSummaries) : [];

    // Level 3: Synthesize domain-level insights
    const domains = topics.length >= 2 ? this.synthesizeDomains(topics) : [];

    // Persist all summaries as semantic memories
    await this.persistSummaries(db, [...sessionSummaries, ...topics, ...domains]);

    return {
      sessionsCreated: sessionSummaries.length,
      topicsCreated: topics.length,
      domainsCreated: domains.length,
      totalEpisodesProcessed: episodes.length,
    };
  }

  /** Load all episodic memories sorted by timestamp */
  private loadEpisodes(db: Database.Database): EpisodicMemory[] {
    const rows = db
      .prepare('SELECT * FROM episodic_memory ORDER BY timestamp ASC')
      .all() as EpisodicRow[];

    return rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      timestamp: row.timestamp,
      query: row.query,
      response: row.response,
      sessionId: row.session_id ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /** Group episodes by time proximity into session buckets */
  groupIntoSessions(episodes: EpisodicMemory[]): EpisodicMemory[][] {
    if (episodes.length === 0) return [];

    const sessions: EpisodicMemory[][] = [];
    let currentSession: EpisodicMemory[] = [episodes[0]];

    for (let i = 1; i < episodes.length; i++) {
      const gap = episodes[i].timestamp - episodes[i - 1].timestamp;
      if (gap > this.sessionWindowMs) {
        sessions.push(currentSession);
        currentSession = [];
      }
      currentSession.push(episodes[i]);
    }
    if (currentSession.length > 0) sessions.push(currentSession);

    return sessions;
  }

  /** Create Level-1 session summaries from episode groups */
  private summarizeSessions(sessions: EpisodicMemory[][]): SummaryLevel[] {
    return sessions.map((session, idx) => {
      const texts = session.map((e) => `Q: ${e.query}\nA: ${e.response}`);
      const sourceIds = session.map((e) => e.id).filter((id): id is number => id !== undefined);

      return {
        level: 1,
        label: `session-${idx + 1}`,
        text: this.summarize(texts),
        sourceIds,
        importance: 4, // Sessions are mid-importance
        metadata: {
          hierarchyLevel: 'session',
          episodeCount: session.length,
          timeRange: {
            start: session[0].timestamp,
            end: session[session.length - 1].timestamp,
          },
          sources: [...new Set(session.map((e) => e.sourceId))],
        },
      };
    });
  }

  /** Create Level-2 topic summaries from session summaries */
  private extractTopics(sessions: SummaryLevel[]): SummaryLevel[] {
    // Group sessions by shared keywords for topic clustering
    const topicGroups = this.clusterByKeywords(sessions);

    return topicGroups.map((group, idx) => ({
      level: 2,
      label: `topic-${idx + 1}`,
      text: this.summarize(group.map((s) => s.text)),
      sourceIds: group.flatMap((s) => s.sourceIds),
      importance: 7, // Topics are higher importance
      metadata: {
        hierarchyLevel: 'topic',
        sessionCount: group.length,
        combinedEpisodes: group.reduce(
          (sum, s) => sum + ((s.metadata.episodeCount as number) ?? 0),
          0,
        ),
      },
    }));
  }

  /** Create Level-3 domain summaries from topics */
  private synthesizeDomains(topics: SummaryLevel[]): SummaryLevel[] {
    // Single domain summary from all topics
    return [
      {
        level: 3,
        label: 'domain-synthesis',
        text: this.summarize(topics.map((t) => t.text)),
        sourceIds: topics.flatMap((t) => t.sourceIds),
        importance: 9, // Domain-level wisdom is highest
        metadata: {
          hierarchyLevel: 'domain',
          topicCount: topics.length,
          totalSources: topics.flatMap((t) => t.sourceIds).length,
        },
      },
    ];
  }

  /** Simple keyword-overlap clustering for topic extraction */
  private clusterByKeywords(summaries: SummaryLevel[]): SummaryLevel[][] {
    if (summaries.length <= 2) return [summaries];

    const keywords = summaries.map(
      (s) =>
        new Set(
          s.text
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 4),
        ),
    );

    // Greedy clustering: merge summaries with >30% keyword overlap
    const clusters: SummaryLevel[][] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < summaries.length; i++) {
      if (assigned.has(i)) continue;
      const cluster = [summaries[i]];
      assigned.add(i);

      for (let j = i + 1; j < summaries.length; j++) {
        if (assigned.has(j)) continue;
        const overlap = this.keywordOverlap(keywords[i], keywords[j]);
        if (overlap > 0.3) {
          cluster.push(summaries[j]);
          assigned.add(j);
        }
      }
      clusters.push(cluster);
    }

    return clusters;
  }

  /** Jaccard similarity between two keyword sets */
  private keywordOverlap(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let intersection = 0;
    for (const word of a) {
      if (b.has(word)) intersection++;
    }
    return intersection / (a.size + b.size - intersection);
  }

  /** Persist summary levels as semantic memories */
  private async persistSummaries(db: Database.Database, summaries: SummaryLevel[]): Promise<void> {
    // Capture the embedder so TS narrows it to non-nullable inside the loop.
    const embedder = this.embedder;
    const hasEmbedder = embedder !== undefined && embedder !== null;

    // Pre-compute embeddings if service available
    const embeddings: Buffer[] = [];
    if (hasEmbedder) {
      for (const summary of summaries) {
        const vec = await embedder.embed(summary.text);
        const buf = Buffer.alloc(vec.length * 4);
        vec.forEach((v, i) => buf.writeFloatLE(v, i * 4));
        embeddings.push(buf);
      }
    }

    const stmt = hasEmbedder
      ? db.prepare(`
          INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count, metadata)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `)
      : db.prepare(`
          INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count, metadata)
          VALUES (?, zeroblob(0), ?, ?, ?, 0, ?)
        `);

    const insertAll = db.transaction((items: SummaryLevel[]) => {
      const now = Date.now();
      for (let i = 0; i < items.length; i++) {
        const summary = items[i];
        if (hasEmbedder) {
          stmt.run(
            summary.text,
            embeddings[i],
            `hierarchy-${summary.label}`,
            summary.importance,
            now,
            JSON.stringify(summary.metadata),
          );
        } else {
          stmt.run(
            summary.text,
            `hierarchy-${summary.label}`,
            summary.importance,
            now,
            JSON.stringify(summary.metadata),
          );
        }
      }
    });

    insertAll(summaries);
  }

  /** Get summarization statistics from existing hierarchy data */
  getStats(db: Database.Database): {
    sessions: number;
    topics: number;
    domains: number;
    totalEpisodes: number;
  } {
    const episodeCount = (
      db.prepare('SELECT COUNT(*) as count FROM episodic_memory').get() as { count: number }
    ).count;

    let sessions = 0;
    let topics = 0;
    let domains = 0;

    try {
      const rows = db
        .prepare(
          "SELECT category, COUNT(*) as count FROM semantic_memory WHERE category LIKE 'hierarchy-%' GROUP BY category",
        )
        .all() as Array<{ category: string; count: number }>;

      for (const row of rows) {
        if (row.category.startsWith('hierarchy-session')) sessions += row.count;
        else if (row.category.startsWith('hierarchy-topic')) topics += row.count;
        else if (row.category.startsWith('hierarchy-domain')) domains += row.count;
      }
    } catch {
      // No hierarchy data yet
    }

    return { sessions, topics, domains, totalEpisodes: episodeCount };
  }
}
