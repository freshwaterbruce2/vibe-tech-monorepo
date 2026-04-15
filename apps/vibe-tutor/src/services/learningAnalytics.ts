/**
 * Learning Analytics Service for Vibe Tutor
 * Tracks, analyzes, and stores learning patterns on D: drive
 * Provides adaptive difficulty and personalized recommendations
 */

import { BLAKE_CONFIG } from '@/config';
import { CapacitorHttp } from '@capacitor/core';
import { databaseService } from './databaseService';

import { appStore } from '../utils/electronStore';
import { logger } from '../utils/logger';

// Learning analytics data path on D: drive
const ANALYTICS_PATH = 'D:\\learning-system\\vibe-tutor';

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

export class LearningAnalyticsService {
  private currentSession: LearningMetrics | null = null;
  private sessionStartTime: number = 0;
  private analytics: Map<string, LearningMetrics> = new Map();

  /**
   * Initialize learning analytics system
   */
  async initialize(): Promise<void> {
    try {
      // Create directories on D: drive if needed
      await this.ensureAnalyticsDirectory();

      // Load existing analytics data
      await this.loadAnalyticsData();

    } catch (error) {
      logger.error('Failed to initialize learning analytics:', error);
    }
  }

  /**
   * Ensure analytics directory exists on D: drive
   */
  private async ensureAnalyticsDirectory(): Promise<void> {
    // In a real implementation, we'd use Node.js fs module
    // For browser environment, we'll store in database
  }

  /**
   * Load existing analytics data
   */
  private async loadAnalyticsData(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) return;

    const result = await db.query(`
      SELECT * FROM learning_sessions
      ORDER BY session_date DESC
      LIMIT 100
    `);

    if (result.values) {
      result.values.forEach((session: Record<string, unknown>) => {
        this.analytics.set(session.id as string, session as unknown as LearningMetrics);
      });
    }
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
  startSession(activity: string, subject: string, difficulty: 'easy' | 'medium' | 'hard'): void {
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
  }

  /**
   * Log event to backend (which writes to D: drive)
   */
  async logEvent(event: string, data: Record<string, unknown> = {}): Promise<void> {
    if (!BLAKE_CONFIG.apiKey) return;

    try {
      await CapacitorHttp.post({
        url: `${BLAKE_CONFIG.apiEndpoint}/chat/completions`,
        headers: {
          Authorization: `Bearer ${BLAKE_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: { event, data },
      });
    } catch (error) {
      logger.error('[Analytics] Failed to log event to backend:', error);
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
  ): Promise<void> {
    await this.logEvent('ai_call', {
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
  async endSession(completionRate: number): Promise<void> {
    if (!this.currentSession) return;

    // Calculate session duration
    this.currentSession.duration = Math.round((Date.now() - this.sessionStartTime) / 60000); // in minutes
    this.currentSession.completionRate = completionRate;

    // Save to database
    await databaseService.recordLearningSession({
      type: this.currentSession.activity,
      duration: this.currentSession.duration,
      focusScore: this.currentSession.focusLevel,
      tasksCompleted: Math.round(completionRate * 10),
    });

    // Store in analytics
    this.analytics.set(this.currentSession.sessionId, this.currentSession);

    // Save to D: drive (async, non-blocking)
    void this.saveAnalyticsToFile(this.currentSession);

    this.currentSession = null;
    this.sessionStartTime = 0;
  }

  /**
   * Save analytics data to D: drive
   */
  private async saveAnalyticsToFile(metrics: LearningMetrics): Promise<void> {
    try {
      // In browser environment, we'll store in IndexedDB as fallback
      // In production, this would write to D:\learning-system\vibe-tutor\
      const analyticsData = {
        ...metrics,
        savedAt: new Date().toISOString(),
        path: `${ANALYTICS_PATH}\\sessions\\${metrics.sessionId}.json`,
      };

      // Store in browser storage as backup
      if (appStore) {
        appStore.set(`analytics_${metrics.sessionId}`, JSON.stringify(analyticsData));
      }
    } catch (error) {
      logger.error('Failed to save analytics to file:', error);
    }
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
