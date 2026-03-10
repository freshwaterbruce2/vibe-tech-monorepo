/**
 * Tests for RecommendationsDatabase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecommendationsDatabase } from '../src/recommendations-db.js';

describe('RecommendationsDatabase', () => {
  let db: RecommendationsDatabase;

  beforeEach(() => {
    db = new RecommendationsDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('Recommendations', () => {
    const sampleRecommendation = {
      type: 'next-steps' as const,
      priority: 'high' as const,
      status: 'pending' as const,
      title: 'Add unit tests',
      description: 'The module lacks test coverage',
      reasoning: 'Test coverage is below 50%',
      actionLabel: 'Create tests',
      actionCommand: 'pnpm test:generate',
      confidence: 0.85,
      context: { module: 'auth' },
      createdAt: Date.now()
    };

    it('should insert and retrieve recommendation', () => {
      const id = db.insertRecommendation(sampleRecommendation);
      expect(id).toBeGreaterThan(0);

      const retrieved = db.getRecommendation(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe(sampleRecommendation.title);
      expect(retrieved!.confidence).toBe(0.85);
      expect(retrieved!.context).toEqual({ module: 'auth' });
    });

    it('should return null for non-existent recommendation', () => {
      const retrieved = db.getRecommendation(9999);
      expect(retrieved).toBeNull();
    });

    it('should get pending recommendations sorted by priority', () => {
      db.insertRecommendation({ ...sampleRecommendation, priority: 'low', title: 'Low priority' });
      db.insertRecommendation({ ...sampleRecommendation, priority: 'urgent', title: 'Urgent' });
      db.insertRecommendation({ ...sampleRecommendation, priority: 'medium', title: 'Medium' });

      const pending = db.getPendingRecommendations();
      expect(pending).toHaveLength(3);
      expect(pending[0].title).toBe('Urgent');
      expect(pending[2].title).toBe('Low priority');
    });

    it('should exclude expired recommendations from pending', () => {
      const now = Date.now();
      
      db.insertRecommendation({
        ...sampleRecommendation,
        title: 'Expired',
        expiresAt: now - 10000
      });

      db.insertRecommendation({
        ...sampleRecommendation,
        title: 'Not expired',
        expiresAt: now + 100000
      });

      const pending = db.getPendingRecommendations();
      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe('Not expired');
    });

    it('should get recommendations by type', () => {
      db.insertRecommendation({ ...sampleRecommendation, type: 'next-steps', title: 'Next' });
      db.insertRecommendation({ ...sampleRecommendation, type: 'code-quality', title: 'Quality' });

      const nextSteps = db.getRecommendationsByType('next-steps');
      expect(nextSteps).toHaveLength(1);
      expect(nextSteps[0].title).toBe('Next');
    });

    it('should update recommendation status', () => {
      const id = db.insertRecommendation(sampleRecommendation);
      
      const success = db.updateRecommendationStatus(id, 'accepted');
      expect(success).toBe(true);

      const updated = db.getRecommendation(id);
      expect(updated!.status).toBe('accepted');
      expect(updated!.respondedAt).not.toBeNull();
    });

    it('should expire old recommendations', () => {
      const now = Date.now();
      
      db.insertRecommendation({
        ...sampleRecommendation,
        title: 'Should expire',
        expiresAt: now - 10000
      });

      db.insertRecommendation({
        ...sampleRecommendation,
        title: 'Should not expire',
        expiresAt: now + 100000
      });

      const expiredCount = db.expireOldRecommendations();
      expect(expiredCount).toBe(1);

      const shouldBeExpired = db.getRecommendationsByType('next-steps')
        .find(r => r.title === 'Should expire');
      expect(shouldBeExpired!.status).toBe('expired');
    });
  });

  describe('Feedback', () => {
    it('should insert and retrieve feedback', () => {
      const recId = db.insertRecommendation({
        type: 'next-steps',
        priority: 'high',
        status: 'accepted',
        title: 'Test',
        description: 'Test',
        reasoning: 'Test',
        confidence: 0.8,
        context: {},
        createdAt: Date.now()
      });

      const feedbackId = db.insertFeedback({
        recommendationId: recId,
        wasHelpful: true,
        feedback: 'Very useful!',
        timestamp: Date.now()
      });

      expect(feedbackId).toBeGreaterThan(0);

      const feedback = db.getFeedbackForRecommendation(recId);
      expect(feedback).toHaveLength(1);
      expect(feedback[0].wasHelpful).toBe(true);
      expect(feedback[0].feedback).toBe('Very useful!');
    });
  });

  describe('Statistics', () => {
    it('should return correct recommendation stats', () => {
      const base = {
        type: 'next-steps' as const,
        priority: 'high' as const,
        title: 'Test',
        description: 'Test',
        reasoning: 'Test',
        confidence: 0.8,
        context: {},
        createdAt: Date.now()
      };

      const id1 = db.insertRecommendation({ ...base, status: 'pending' });
      const id2 = db.insertRecommendation({ ...base, status: 'accepted' });
      db.insertRecommendation({ ...base, status: 'rejected' });

      db.insertFeedback({ recommendationId: id1, wasHelpful: true, timestamp: Date.now() });
      db.insertFeedback({ recommendationId: id2, wasHelpful: true, timestamp: Date.now() });
      db.insertFeedback({ recommendationId: id2, wasHelpful: false, timestamp: Date.now() });

      const stats = db.getRecommendationStats();
      expect(stats.totalRecommendations).toBe(3);
      expect(stats.pendingCount).toBe(1);
      expect(stats.acceptedCount).toBe(1);
      expect(stats.rejectedCount).toBe(1);
      expect(stats.helpfulRate).toBeCloseTo(0.667, 2);
    });
  });
});
