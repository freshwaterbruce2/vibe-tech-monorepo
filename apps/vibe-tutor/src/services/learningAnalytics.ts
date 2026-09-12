/**
 * Learning Analytics Service for Vibe Tutor
 * Tracks and stores privacy-minimized learning patterns in app-local storage.
 * Provides adaptive difficulty and personalized recommendations
 */

import { databaseService } from './databaseService';
import { dataStore } from './dataStore';

import { appStore } from '../utils/electronStore';
import { logger } from '../utils/logger';

const ANALYTICS_STORAGE_KEY = 'learning-analytics-v1';
const ANALYTICS_ENABLED_KEY = 'learning-analytics-enabled';
const LEGACY_ANALYTICS_INDEX_KEY = 'analytics_index';
const ANALYTICS_TEXT_CAP = 120;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function boundedNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= ANALYTICS_TEXT_CAP ? trimmed : null;
}

function nonNegativeFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function finiteNumberInRange(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

export interface LearningMetrics {
  sessionId: string;
  userId?: string;
  timestamp: Date;
  activity: string;
  subject: string;
  duration: number;
  performance: {
    correct: number;
    incorrect: number;
    accuracy: number;
  };
  focusLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completionRate: number;
}

export interface LearningPattern {
  bestTimeOfDay: string;
  strongSubjects: string[];
  weakSubjects: string[];
  averageFocusDuration: number;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  progressTrend: 'improving' | 'stable' | 'declining';
}

export interface AdaptiveRecommendation {
  subject: string;
  difficulty: string;
  suggestedDuration: number;
  reason: string;
  activities: string[];
}

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  data: Record<string, string | number | boolean>;
}

interface PersistedAnalytics {
  version: 1;
  sessions: Array<Omit<LearningMetrics, 'timestamp'> & { timestamp: string }>;
  events: AnalyticsEvent[];
}

export interface LocalAnalyticsExport {
  format: 'vibe-tutor-learning-analytics-v1';
  sessions: LearningMetrics[];
  events: AnalyticsEvent[];
}

export class LearningAnalyticsService {
  private static readonly ANALYTICS_KEY_CAP = 100;
  private currentSession: LearningMetrics | null = null;
  private sessionStartTime: number = 0;
  private analytics: Map<string, LearningMetrics> = new Map();
  private events: AnalyticsEvent[] = [];
  private enabled = true;
  private analyticsPersistence: Promise<boolean> = Promise.resolve(true);

  /**
   * Initialize learning analytics system
   */
  async initialize(): Promise<boolean> {
    try {
      this.enabled = (await dataStore.getUserSettings(ANALYTICS_ENABLED_KEY)) !== 'false';
      if (!this.enabled) return true;
      await this.loadAnalyticsData();
      return true;
    } catch (error) {
      logger.error('Failed to initialize learning analytics:', error);
      return false;
    }
  }

  /**
   * Load existing analytics data
   */
  private async loadAnalyticsData(): Promise<void> {
    const saved = await dataStore.getUserSettings(ANALYTICS_STORAGE_KEY);
    if (saved) {
      const persisted = this.parsePersistedAnalytics(saved);
      if (!persisted) {
        throw new Error('Stored learning analytics are malformed');
      }
      this.events = persisted.events;
      for (const session of persisted.sessions) {
        const metrics = this.deserializeSession(session);
        if (!metrics) {
          throw new Error('Stored learning analytics contain a malformed session');
        }
        this.storeSession(metrics);
      }
    } else if (this.loadLegacyAnalyticsData()) {
      if (!(await this.persistAnalyticsData())) {
        throw new Error('Could not migrate legacy learning analytics');
      }
    }

    const db = databaseService.getConnection();
    if (!db) return;

    const result = await db.query(`
      SELECT * FROM learning_sessions
      ORDER BY session_date DESC
      LIMIT 100
    `);

    if (result.values) {
      result.values.forEach((row: Record<string, unknown>) => {
        const metrics = this.mapSessionRowToMetrics(row);
        if (metrics) this.storeSession(metrics);
      });
    }
  }

  private loadLegacyAnalyticsData(): boolean {
    const index = appStore.getStrict<string[]>(LEGACY_ANALYTICS_INDEX_KEY);
    if (index == null) return false;
    if (!Array.isArray(index)) {
      throw new Error('Legacy learning analytics index is malformed');
    }
    const referencedSessions = index.slice(-LearningAnalyticsService.ANALYTICS_KEY_CAP);
    for (const sessionId of referencedSessions) {
      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Legacy learning analytics index contains an invalid session id');
      }
      const saved = appStore.getStrict<unknown>(`analytics_${sessionId}`);
      const metrics = this.deserializeSession(saved);
      if (!metrics) {
        throw new Error('Legacy learning analytics contains a missing or malformed session');
      }
      this.storeSession(metrics);
    }
    return referencedSessions.length > 0;
  }

  private parsePersistedAnalytics(saved: string): PersistedAnalytics | null {
    try {
      const parsed = JSON.parse(saved) as PersistedAnalytics;
      if (
        parsed?.version !== 1 ||
        !Array.isArray(parsed.sessions) ||
        !Array.isArray(parsed.events) ||
        parsed.sessions.length > LearningAnalyticsService.ANALYTICS_KEY_CAP ||
        parsed.events.length > LearningAnalyticsService.ANALYTICS_KEY_CAP
      ) {
        return null;
      }
      if (
        parsed.sessions.some((session) => !this.deserializeSession(session)) ||
        parsed.events.some((event) => !this.deserializeEvent(event))
      ) {
        return null;
      }
      return {
        ...parsed,
        events: parsed.events.map((event) => this.deserializeEvent(event)!),
      };
    } catch {
      return null;
    }
  }

  private deserializeSession(value: unknown): LearningMetrics | null {
    if (!isPlainRecord(value)) return null;
    const sessionId = boundedNonEmptyString(value.sessionId);
    const activity = boundedNonEmptyString(value.activity);
    const subject = boundedNonEmptyString(value.subject);
    const timestampValue = boundedNonEmptyString(value.timestamp);
    const duration = nonNegativeFiniteNumber(value.duration);
    const focusLevel = finiteNumberInRange(value.focusLevel, 0, 100);
    const completionRate = finiteNumberInRange(value.completionRate, 0, 1);
    const performance = value.performance;
    if (
      !sessionId ||
      !activity ||
      !subject ||
      !timestampValue ||
      duration === null ||
      focusLevel === null ||
      completionRate === null ||
      !isPlainRecord(performance)
    ) return null;

    const timestamp = new Date(timestampValue);
    const correct = nonNegativeFiniteNumber(performance.correct);
    const incorrect = nonNegativeFiniteNumber(performance.incorrect);
    const accuracy = finiteNumberInRange(performance.accuracy, 0, 100);
    const difficulty = value.difficulty;
    if (
      Number.isNaN(timestamp.getTime()) ||
      correct === null ||
      incorrect === null ||
      accuracy === null ||
      (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard')
    ) return null;

    const rawUserId = value.userId;
    const userId = rawUserId === undefined ? undefined : boundedNonEmptyString(rawUserId);
    if (rawUserId !== undefined && !userId) return null;

    return {
      sessionId,
      timestamp,
      activity,
      subject,
      duration,
      performance: {
        correct,
        incorrect,
        accuracy,
      },
      focusLevel,
      difficulty,
      completionRate,
      ...(userId ? { userId } : {}),
    };
  }

  private deserializeEvent(value: unknown): AnalyticsEvent | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<AnalyticsEvent>;
    if (
      typeof candidate.event !== 'string' ||
      !candidate.event ||
      candidate.event.length > 80 ||
      typeof candidate.timestamp !== 'string' ||
      Number.isNaN(Date.parse(candidate.timestamp)) ||
      !candidate.data ||
      typeof candidate.data !== 'object' ||
      Array.isArray(candidate.data)
    ) {
      return null;
    }
    const minimized = this.minimizeEventData(candidate.data as Record<string, unknown>);
    if (Object.keys(minimized).length !== Object.keys(candidate.data).length) return null;
    return { event: candidate.event, timestamp: candidate.timestamp, data: minimized };
  }

  private storeSession(metrics: LearningMetrics): void {
    this.analytics.delete(metrics.sessionId);
    this.analytics.set(metrics.sessionId, metrics);
    while (this.analytics.size > LearningAnalyticsService.ANALYTICS_KEY_CAP) {
      const oldestSessionId = this.analytics.keys().next().value;
      if (!oldestSessionId) break;
      this.analytics.delete(oldestSessionId);
    }
  }

  /**
   * Map a raw `learning_sessions` DB row into a validated LearningMetrics.
   * The table only stores a subset of columns, so build a complete object with
   * safe defaults instead of blindly casting. Returns null for rows without a
   * usable id so callers can skip malformed data.
   */
  private mapSessionRowToMetrics(row: Record<string, unknown>): LearningMetrics | null {
    if (!row || typeof row !== 'object') return null;
    const id = row.id != null ? String(row.id) : '';
    if (!id) return null;

    const durationMinutes = Number(row.duration_minutes ?? 0);
    const focusScore = Number(row.focus_score ?? 0);
    const tasksCompleted = Number(row.tasks_completed ?? 0);
    const activity = typeof row.session_type === 'string' ? row.session_type : 'session';
    const timestamp =
      typeof row.session_date === 'string' ? new Date(row.session_date) : new Date();
    if (Number.isNaN(timestamp.getTime())) return null;

    return {
      sessionId: id,
      timestamp,
      activity,
      subject: activity,
      duration: Number.isFinite(durationMinutes) ? durationMinutes : 0,
      performance: { correct: 0, incorrect: 0, accuracy: 0 },
      focusLevel: Number.isFinite(focusScore) ? focusScore : 0,
      difficulty: 'medium',
      completionRate: Number.isFinite(tasksCompleted) ? Math.min(1, tasksCompleted / 10) : 0,
    };
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId ?? null;
  }

  /**
   * Start a new learning session
   */
  startSession(activity: string, subject: string, difficulty: 'easy' | 'medium' | 'hard'): boolean {
    if (!this.enabled) return false;
    this.sessionStartTime = Date.now();
    this.currentSession = {
      sessionId: crypto.randomUUID(),
      timestamp: new Date(),
      activity,
      subject,
      duration: 0,
      performance: { correct: 0, incorrect: 0, accuracy: 0 },
      focusLevel: 10,
      difficulty,
      completionRate: 0,
    };

    void this.logEvent('session_start', { activity, subject, difficulty });
    return true;
  }

  /**
   * Store a privacy-minimized analytics event in the app-local analytics record.
   */
  async logEvent(event: string, data: Record<string, unknown> = {}): Promise<boolean> {
    if (!this.enabled || !event.trim()) return false;
    try {
      this.events.push({
        event: event.trim().slice(0, 80),
        timestamp: new Date().toISOString(),
        data: this.minimizeEventData(data),
      });
      if (this.events.length > LearningAnalyticsService.ANALYTICS_KEY_CAP) {
        this.events = this.events.slice(-LearningAnalyticsService.ANALYTICS_KEY_CAP);
      }
      return await this.persistAnalyticsData();
    } catch (error) {
      logger.error('[Analytics] Failed to store local event:', error);
      return false;
    }
  }

  /**
   * Log AI call for tracing
   */
  async logAICall(
    model: string,
    promptLength: number,
    responseLength: number,
    duration: number,
  ): Promise<boolean> {
    return this.logEvent('ai_call', {
      model,
      promptLength,
      responseLength,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update session performance
   */
  updatePerformance(correct: boolean): void {
    if (!this.currentSession) return;

    if (correct) {
      this.currentSession.performance.correct++;
    } else {
      this.currentSession.performance.incorrect++;
    }

    const total =
      this.currentSession.performance.correct + this.currentSession.performance.incorrect;
    this.currentSession.performance.accuracy =
      total > 0 ? (this.currentSession.performance.correct / total) * 100 : 0;
  }

  /**
   * Update focus level based on activity patterns
   */
  updateFocusLevel(isActive: boolean): void {
    if (!this.currentSession) return;

    // Decrease focus if inactive, increase if active
    if (!isActive) {
      this.currentSession.focusLevel = Math.max(0, this.currentSession.focusLevel - 5);
    } else {
      this.currentSession.focusLevel = Math.min(100, this.currentSession.focusLevel + 2);
    }
  }

  /**
   * End current learning session and save analytics
   */
  async endSession(completionRate: number): Promise<boolean> {
    if (!this.currentSession || !this.enabled) return false;
    if (!Number.isFinite(completionRate) || completionRate < 0 || completionRate > 1) return false;

    // Claim this specific session before awaiting any I/O. A new session may
    // start while the ending one is being saved, and must remain untouched.
    const endingSession = this.currentSession;
    const endingSessionStartTime = this.sessionStartTime;
    this.currentSession = null;
    this.sessionStartTime = 0;

    // Calculate session duration
    endingSession.duration = Math.round((Date.now() - endingSessionStartTime) / 60000); // in minutes
    endingSession.completionRate = completionRate;

    // Save to database
    try {
      const insertedSessionId = await databaseService.recordLearningSession({
        type: endingSession.activity,
        duration: endingSession.duration,
        focusScore: endingSession.focusLevel,
        tasksCompleted: Math.round(completionRate * 10),
      });

      endingSession.sessionId = String(insertedSessionId);
      this.storeSession(endingSession);
      const persisted = await this.persistAnalyticsData();
      if (!persisted) this.analytics.delete(endingSession.sessionId);
      return persisted;
    } catch (error) {
      logger.error('Failed to store local learning analytics:', error);
      return false;
    }
  }

  /**
   * Persist analytics in the app-local store and verify the saved schema.
   */
  private async persistAnalyticsData(): Promise<boolean> {
    const write = this.analyticsPersistence.then(async () => {
      try {
        const persisted: PersistedAnalytics = {
          version: 1,
          sessions: Array.from(this.analytics.values()).map((metrics) => ({
            ...metrics,
            timestamp: metrics.timestamp.toISOString(),
          })),
          events: [...this.events],
        };
        const serialized = JSON.stringify(persisted);
        await dataStore.saveUserSettings(ANALYTICS_STORAGE_KEY, serialized);
        const confirmed = await dataStore.getUserSettings(ANALYTICS_STORAGE_KEY);
        return confirmed === serialized && this.parsePersistedAnalytics(confirmed) !== null;
      } catch (error) {
        logger.error('Failed to persist local analytics:', error);
        return false;
      }
    });
    this.analyticsPersistence = write.catch(() => false);
    return write;
  }

  /**
   * Produce a platform-neutral local export payload. It is data, not a file;
   * callers decide whether a user-initiated export destination is available.
   */
  async exportLocalAnalytics(): Promise<LocalAnalyticsExport> {
    return {
      format: 'vibe-tutor-learning-analytics-v1',
      sessions: Array.from(this.analytics.values()),
      events: [...this.events],
    };
  }

  private minimizeEventData(data: Record<string, unknown>): Record<string, string | number | boolean> {
    const allowed = new Set([
      'activity', 'subject', 'difficulty', 'model', 'promptLength', 'responseLength', 'durationMs',
    ]);
    return Object.fromEntries(
      Object.entries(data)
        .filter(
          ([key, value]) =>
            allowed.has(key) &&
            (typeof value === 'string' ||
              typeof value === 'boolean' ||
              (typeof value === 'number' && Number.isFinite(value))),
        )
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim().slice(0, 80) : value])
        .filter(([, value]) => value !== ''),
    );
  }

  /**
   * Analyze learning patterns for the user
   */
  async analyzeLearningPatterns(): Promise<LearningPattern> {
    const sessions = Array.from(this.analytics.values());

    if (sessions.length === 0) {
      return this.getDefaultPattern();
    }

    // Analyze best time of day
    const timeDistribution = this.analyzeTimeDistribution(sessions);

    // Identify strong and weak subjects
    const subjectPerformance = this.analyzeSubjectPerformance(sessions);

    // Calculate average focus duration
    const avgFocus = this.calculateAverageFocus(sessions);

    // Determine learning style
    const style = this.determineLearningStyle(sessions);

    // Analyze progress trend
    const trend = this.analyzeProgressTrend(sessions);

    return {
      bestTimeOfDay: timeDistribution,
      strongSubjects: subjectPerformance.strong,
      weakSubjects: subjectPerformance.weak,
      averageFocusDuration: avgFocus,
      learningStyle: style,
      progressTrend: trend,
    };
  }

  /**
   * Generate adaptive recommendations
   */
  async generateRecommendations(pattern: LearningPattern): Promise<AdaptiveRecommendation[]> {
    const recommendations: AdaptiveRecommendation[] = [];

    // Recommend focus on weak subjects
    for (const subject of pattern.weakSubjects) {
      recommendations.push({
        subject,
        difficulty: 'easy',
        suggestedDuration: Math.min(pattern.averageFocusDuration, 25),
        reason: `Practice ${subject} at easier level to build confidence`,
        activities: ['Practice problems', 'Video tutorials', 'Interactive exercises'],
      });
    }

    // Challenge in strong subjects
    for (const subject of pattern.strongSubjects) {
      recommendations.push({
        subject,
        difficulty: 'hard',
        suggestedDuration: pattern.averageFocusDuration,
        reason: `Challenge yourself in ${subject} to advance further`,
        activities: ['Advanced problems', 'Timed challenges', 'Competition mode'],
      });
    }

    return recommendations;
  }

  /**
   * Get adaptive difficulty for a subject
   */
  async getAdaptiveDifficulty(subject: string): Promise<'easy' | 'medium' | 'hard'> {
    const progress = await databaseService.getUserProgress(subject);

    if (progress.length === 0) {
      return 'easy';
    }

    const recent = progress.slice(0, 5);
    const avgAccuracy =
      recent.reduce(
        (sum, p) => sum + (p.correct_answers / Math.max(p.total_attempts, 1)) * 100,
        0,
      ) / recent.length;

    if (avgAccuracy >= 80) return 'hard';
    if (avgAccuracy >= 60) return 'medium';
    return 'easy';
  }

  // Helper methods
  private analyzeTimeDistribution(sessions: LearningMetrics[]): string {
    const hours = sessions.map((s) => new Date(s.timestamp).getHours());
    const hourCounts: Record<string, number> = {};

    hours.forEach((h) => {
      const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      hourCounts[period] = (hourCounts[period] ?? 0) + 1;
    });

    return Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'afternoon';
  }

  private analyzeSubjectPerformance(sessions: LearningMetrics[]): {
    strong: string[];
    weak: string[];
  } {
    const subjectScores: Record<string, number> = {};

    sessions.forEach((s) => {
      subjectScores[s.subject] ??= 0;
      subjectScores[s.subject]! += s.performance?.accuracy ?? 0;
    });

    const sorted = Object.entries(subjectScores)
      .map(([subject, score]) => ({ subject, score }))
      .sort((a, b) => b.score - a.score);

    return {
      strong: sorted.slice(0, 2).map((s) => s.subject),
      weak: sorted.slice(-2).map((s) => s.subject),
    };
  }

  private calculateAverageFocus(sessions: LearningMetrics[]): number {
    const durations = sessions.filter((s) => s.focusLevel >= 50).map((s) => s.duration);

    if (durations.length === 0) return 15;

    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }

  private determineLearningStyle(
    sessions: LearningMetrics[],
  ): 'visual' | 'auditory' | 'kinesthetic' | 'mixed' {
    // Simplified heuristic based on activity types
    const activityTypes = sessions.map((s) => s.activity);

    const counts = {
      visual: activityTypes.filter((a) => a.includes('video') || a.includes('diagram')).length,
      auditory: activityTypes.filter((a) => a.includes('audio') || a.includes('music')).length,
      kinesthetic: activityTypes.filter((a) => a.includes('game') || a.includes('interactive'))
        .length,
    };

    const max = Math.max(...Object.values(counts));
    if (max === 0) return 'mixed';

    const dominant = Object.entries(counts).find(([_, count]) => count === max)?.[0] as
      | 'visual'
      | 'auditory'
      | 'kinesthetic'
      | undefined;
    return dominant ?? 'mixed';
  }

  private analyzeProgressTrend(sessions: LearningMetrics[]): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 5) return 'stable';

    const recentScores = sessions.slice(0, 5).map((s) => s.performance?.accuracy || 0);
    const olderScores = sessions.slice(5, 10).map((s) => s.performance?.accuracy || 0);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / Math.max(olderScores.length, 1);

    if (recentAvg > olderAvg + 10) return 'improving';
    if (recentAvg < olderAvg - 10) return 'declining';
    return 'stable';
  }

  private getDefaultPattern(): LearningPattern {
    return {
      bestTimeOfDay: 'afternoon',
      strongSubjects: [],
      weakSubjects: [],
      averageFocusDuration: 20,
      learningStyle: 'mixed',
      progressTrend: 'stable',
    };
  }
}

// Export singleton instance
export const learningAnalytics = new LearningAnalyticsService();
