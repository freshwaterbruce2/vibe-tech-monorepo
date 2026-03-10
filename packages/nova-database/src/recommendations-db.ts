/**
 * Recommendations Database Service
 * Manages AI recommendations and user feedback using better-sqlite3
 */

import Database from 'better-sqlite3';
import type { Recommendation, RecommendationFeedback, RecommendationStatus } from '@nova/types';
import { resolve } from 'path';

const DB_PATH = process.env.NOVA_RECOMMENDATIONS_DB_PATH ?? 'D:\\databases\\nova_recommendations.db';

interface RecommendationRow {
  id: number;
  type: Recommendation['type'];
  priority: Recommendation['priority'];
  status: RecommendationStatus;
  title: string;
  description: string;
  reasoning: string;
  action_label: string | null;
  action_command: string | null;
  confidence: number;
  context: string;
  created_at: number;
  expires_at: number | null;
  responded_at: number | null;
}

interface FeedbackRow {
  recommendation_id: number;
  was_helpful: number;
  feedback: string | null;
  timestamp: number;
}

export class RecommendationsDatabase {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    const resolvedPath = dbPath === ':memory:' ? ':memory:' : resolve(dbPath);
    this.db = new Database(resolvedPath);
    this.initSchema();
  }

  private initSchema() {
    // Recommendations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('next-steps', 'production-check', 'workflow', 'code-quality', 'git-reminder', 'test-suggestion', 'documentation')),
        priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'deferred', 'expired')) DEFAULT 'pending',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        action_label TEXT,
        action_command TEXT,
        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        context TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        responded_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
      CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority);
      CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at DESC);
    `);

    // Feedback table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recommendation_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recommendation_id INTEGER NOT NULL,
        was_helpful INTEGER NOT NULL CHECK(was_helpful IN (0, 1)),
        feedback TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_recommendation ON recommendation_feedback(recommendation_id);
    `);
  }

  // Recommendation operations
  insertRecommendation(rec: Recommendation): number {
    const stmt = this.db.prepare(`
      INSERT INTO recommendations (
        type, priority, status, title, description, reasoning,
        action_label, action_command, confidence, context,
        created_at, expires_at, responded_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      rec.type,
      rec.priority,
      rec.status,
      rec.title,
      rec.description,
      rec.reasoning,
      rec.actionLabel ?? null,
      rec.actionCommand ?? null,
      rec.confidence,
      JSON.stringify(rec.context),
      rec.createdAt,
      rec.expiresAt ?? null,
      rec.respondedAt ?? null
    );
    return Number(result.lastInsertRowid);
  }

  getRecommendation(id: number): Recommendation | null {
    const stmt = this.db.prepare('SELECT * FROM recommendations WHERE id = ?');
    const row = stmt.get(id) as RecommendationRow | undefined;

    if (!row) return null;

    return this.rowToRecommendation(row);
  }

  getPendingRecommendations(): Recommendation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recommendations 
      WHERE status = 'pending' 
      AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        created_at DESC
    `);
    const rows = stmt.all(Date.now()) as RecommendationRow[];
    return rows.map(row => this.rowToRecommendation(row));
  }

  getRecommendationsByType(type: Recommendation['type']): Recommendation[] {
    const stmt = this.db.prepare('SELECT * FROM recommendations WHERE type = ? ORDER BY created_at DESC');
    const rows = stmt.all(type) as RecommendationRow[];
    return rows.map(row => this.rowToRecommendation(row));
  }

  updateRecommendationStatus(id: number, status: RecommendationStatus): boolean {
    const stmt = this.db.prepare(`
      UPDATE recommendations 
      SET status = ?, responded_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(status, Date.now(), id);
    return result.changes > 0;
  }

  expireOldRecommendations(): number {
    const stmt = this.db.prepare(`
      UPDATE recommendations 
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?
    `);
    const result = stmt.run(Date.now());
    return result.changes;
  }

  // Feedback operations
  insertFeedback(feedback: RecommendationFeedback): number {
    const stmt = this.db.prepare(`
      INSERT INTO recommendation_feedback (recommendation_id, was_helpful, feedback, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      feedback.recommendationId,
      feedback.wasHelpful ? 1 : 0,
      feedback.feedback ?? null,
      feedback.timestamp
    );
    return Number(result.lastInsertRowid);
  }

  getFeedbackForRecommendation(recommendationId: number): RecommendationFeedback[] {
    const stmt = this.db.prepare('SELECT * FROM recommendation_feedback WHERE recommendation_id = ?');
    const rows = stmt.all(recommendationId) as FeedbackRow[];
    return rows.map(row => ({
      recommendationId: row.recommendation_id,
      wasHelpful: row.was_helpful === 1,
      feedback: row.feedback ?? undefined,
      timestamp: row.timestamp
    }));
  }

  // Statistics
  getRecommendationStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM recommendations').get() as { count: number };
    const pending = this.db.prepare("SELECT COUNT(*) as count FROM recommendations WHERE status = 'pending'").get() as { count: number };
    const accepted = this.db.prepare("SELECT COUNT(*) as count FROM recommendations WHERE status = 'accepted'").get() as { count: number };
    const rejected = this.db.prepare("SELECT COUNT(*) as count FROM recommendations WHERE status = 'rejected'").get() as { count: number };

    const feedbackStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_feedback,
        SUM(was_helpful) as helpful_count
      FROM recommendation_feedback
    `).get() as { total_feedback: number; helpful_count: number | null };

    const helpfulRate = feedbackStats.total_feedback > 0
      ? (feedbackStats.helpful_count ?? 0) / feedbackStats.total_feedback
      : 0;

    return {
      totalRecommendations: total.count,
      pendingCount: pending.count,
      acceptedCount: accepted.count,
      rejectedCount: rejected.count,
      acceptanceRate: total.count > 0 ? accepted.count / total.count : 0,
      helpfulRate
    };
  }

  private rowToRecommendation(row: RecommendationRow): Recommendation {
    return {
      id: row.id,
      type: row.type,
      priority: row.priority,
      status: row.status,
      title: row.title,
      description: row.description,
      reasoning: row.reasoning,
      actionLabel: row.action_label ?? undefined,
      actionCommand: row.action_command ?? undefined,
      confidence: row.confidence,
      context: JSON.parse(row.context),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      respondedAt: row.responded_at
    };
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
let recommendationsDb: RecommendationsDatabase | null = null;

export function getRecommendationsDatabase(): RecommendationsDatabase {
  recommendationsDb ??= new RecommendationsDatabase();
  return recommendationsDb;
}
