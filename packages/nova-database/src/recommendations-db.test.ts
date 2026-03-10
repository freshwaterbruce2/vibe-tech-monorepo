import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecommendationsDatabase } from './recommendations-db';
import type { Recommendation, RecommendationFeedback } from '@nova/types';

describe('RecommendationsDatabase', () => {
    let db: RecommendationsDatabase;

    beforeEach(() => {
        db = new RecommendationsDatabase(':memory:');
    });

    afterEach(() => {
        db.close();
    });

    describe('Recommendations', () => {
        const createRec = (overrides: Partial<Recommendation> = {}): Recommendation => ({
            type: 'next-steps',
            priority: 'medium',
            status: 'pending',
            title: 'Test recommendation',
            description: 'Test description',
            reasoning: 'Test reasoning',
            confidence: 0.8,
            context: {},
            createdAt: Date.now(),
            ...overrides,
        });

        it('inserts and retrieves recommendation', () => {
            const rec = createRec();
            const id = db.insertRecommendation(rec);
            expect(id).toBeGreaterThan(0);

            const retrieved = db.getRecommendation(id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.title).toBe('Test recommendation');
        });

        it('gets pending recommendations ordered by priority', () => {
            db.insertRecommendation(createRec({ priority: 'low', title: 'low' }));
            db.insertRecommendation(createRec({ priority: 'urgent', title: 'urgent' }));
            db.insertRecommendation(createRec({ priority: 'high', title: 'high' }));

            const pending = db.getPendingRecommendations();
            expect(pending[0].title).toBe('urgent');
            expect(pending[1].title).toBe('high');
            expect(pending[2].title).toBe('low');
        });

        it('excludes expired recommendations from pending', () => {
            db.insertRecommendation(createRec({ title: 'valid' }));
            db.insertRecommendation(createRec({ title: 'expired', expiresAt: Date.now() - 1000 }));

            const pending = db.getPendingRecommendations();
            expect(pending).toHaveLength(1);
            expect(pending[0].title).toBe('valid');
        });

        it('gets recommendations by type', () => {
            db.insertRecommendation(createRec({ type: 'next-steps' }));
            db.insertRecommendation(createRec({ type: 'git-reminder' }));

            const gitReminders = db.getRecommendationsByType('git-reminder');
            expect(gitReminders).toHaveLength(1);
            expect(gitReminders[0].type).toBe('git-reminder');
        });

        it('updates recommendation status', () => {
            const id = db.insertRecommendation(createRec());

            const updated = db.updateRecommendationStatus(id, 'accepted');
            expect(updated).toBe(true);

            const rec = db.getRecommendation(id);
            expect(rec?.status).toBe('accepted');
            expect(rec?.respondedAt).toBeDefined();
        });

        it('expires old recommendations', () => {
            db.insertRecommendation(createRec({ expiresAt: Date.now() - 1000 }));
            db.insertRecommendation(createRec({ expiresAt: Date.now() + 10000 }));

            const expiredCount = db.expireOldRecommendations();
            expect(expiredCount).toBe(1);

            const pending = db.getPendingRecommendations();
            expect(pending).toHaveLength(1);
        });

        it('stores and retrieves context', () => {
            const rec = createRec({ context: { fileCount: 42, branch: 'main' } });
            const id = db.insertRecommendation(rec);

            const retrieved = db.getRecommendation(id);
            expect(retrieved?.context).toEqual({ fileCount: 42, branch: 'main' });
        });

        it('handles optional fields', () => {
            const rec = createRec({ actionLabel: 'Run tests', actionCommand: 'pnpm test' });
            const id = db.insertRecommendation(rec);

            const retrieved = db.getRecommendation(id);
            expect(retrieved?.actionLabel).toBe('Run tests');
            expect(retrieved?.actionCommand).toBe('pnpm test');
        });
    });

    describe('Feedback', () => {
        it('inserts and retrieves feedback', () => {
            const recId = db.insertRecommendation({
                type: 'next-steps',
                priority: 'medium',
                status: 'pending',
                title: 'Test',
                description: 'Test',
                reasoning: 'Test',
                confidence: 0.5,
                context: {},
                createdAt: Date.now(),
            });

            const feedback: RecommendationFeedback = {
                recommendationId: recId,
                wasHelpful: true,
                feedback: 'Great suggestion!',
                timestamp: Date.now(),
            };

            const id = db.insertFeedback(feedback);
            expect(id).toBeGreaterThan(0);

            const retrieved = db.getFeedbackForRecommendation(recId);
            expect(retrieved).toHaveLength(1);
            expect(retrieved[0].wasHelpful).toBe(true);
            expect(retrieved[0].feedback).toBe('Great suggestion!');
        });

        it('handles multiple feedback entries', () => {
            const recId = db.insertRecommendation({
                type: 'next-steps',
                priority: 'medium',
                status: 'pending',
                title: 'Test',
                description: 'Test',
                reasoning: 'Test',
                confidence: 0.5,
                context: {},
                createdAt: Date.now(),
            });

            db.insertFeedback({ recommendationId: recId, wasHelpful: true, timestamp: Date.now() });
            db.insertFeedback({ recommendationId: recId, wasHelpful: false, timestamp: Date.now() });

            const feedback = db.getFeedbackForRecommendation(recId);
            expect(feedback).toHaveLength(2);
        });
    });

    describe('Statistics', () => {
        it('returns correct counts', () => {
            db.insertRecommendation({
                type: 'next-steps', priority: 'medium', status: 'pending',
                title: 'T', description: 'D', reasoning: 'R', confidence: 0.5,
                context: {}, createdAt: Date.now(),
            });
            db.insertRecommendation({
                type: 'next-steps', priority: 'medium', status: 'accepted',
                title: 'T', description: 'D', reasoning: 'R', confidence: 0.5,
                context: {}, createdAt: Date.now(),
            });
            db.insertRecommendation({
                type: 'next-steps', priority: 'medium', status: 'rejected',
                title: 'T', description: 'D', reasoning: 'R', confidence: 0.5,
                context: {}, createdAt: Date.now(),
            });

            const stats = db.getRecommendationStats();
            expect(stats.totalRecommendations).toBe(3);
            expect(stats.pendingCount).toBe(1);
            expect(stats.acceptedCount).toBe(1);
            expect(stats.rejectedCount).toBe(1);
        });

        it('calculates acceptance rate', () => {
            db.insertRecommendation({
                type: 'next-steps', priority: 'medium', status: 'accepted',
                title: 'T', description: 'D', reasoning: 'R', confidence: 0.5,
                context: {}, createdAt: Date.now(),
            });
            db.insertRecommendation({
                type: 'next-steps', priority: 'medium', status: 'rejected',
                title: 'T', description: 'D', reasoning: 'R', confidence: 0.5,
                context: {}, createdAt: Date.now(),
            });

            const stats = db.getRecommendationStats();
            expect(stats.acceptanceRate).toBe(0.5);
        });

        it('calculates helpful rate', () => {
            const recId = db.insertRecommendation({
                type: 'next-steps', priority: 'medium', status: 'pending',
                title: 'T', description: 'D', reasoning: 'R', confidence: 0.5,
                context: {}, createdAt: Date.now(),
            });

            db.insertFeedback({ recommendationId: recId, wasHelpful: true, timestamp: Date.now() });
            db.insertFeedback({ recommendationId: recId, wasHelpful: true, timestamp: Date.now() });
            db.insertFeedback({ recommendationId: recId, wasHelpful: false, timestamp: Date.now() });

            const stats = db.getRecommendationStats();
            expect(stats.helpfulRate).toBeCloseTo(0.667, 2);
        });
    });
});
