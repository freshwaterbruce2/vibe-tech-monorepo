import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextDatabase } from './context-db';
import type { ProjectContext, CodePattern } from '@nova/types';

describe('ContextDatabase', () => {
    let db: ContextDatabase;

    beforeEach(() => {
        db = new ContextDatabase(':memory:');
    });

    afterEach(() => {
        db.close();
    });

    describe('Projects', () => {
        it('inserts and retrieves project', () => {
            const project: ProjectContext = {
                name: 'my-app',
                path: 'C:\\dev\\apps\\my-app',
                type: 'web-app',
                frameworks: ['react', 'vite'],
                lastActive: Date.now(),
                fileCount: 50,
            };

            const id = db.insertProject(project);
            expect(id).toBeGreaterThan(0);

            const retrieved = db.getProject(project.path);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.name).toBe('my-app');
            expect(retrieved?.frameworks).toContain('react');
        });

        it('updates existing project on conflict', () => {
            const project: ProjectContext = {
                name: 'my-app',
                path: 'C:\\dev\\apps\\my-app',
                type: 'web-app',
                frameworks: ['react'],
                lastActive: Date.now(),
                fileCount: 50,
            };

            db.insertProject(project);
            db.insertProject({ ...project, fileCount: 100 });

            const all = db.getAllProjects();
            expect(all).toHaveLength(1);
            expect(all[0].fileCount).toBe(100);
        });

        it('gets all projects ordered by lastActive', () => {
            const now = Date.now();
            db.insertProject({ name: 'old', path: '/old', type: 'library', frameworks: [], lastActive: now - 1000, fileCount: 10 });
            db.insertProject({ name: 'new', path: '/new', type: 'backend', frameworks: [], lastActive: now, fileCount: 20 });

            const all = db.getAllProjects();
            expect(all[0].name).toBe('new');
            expect(all[1].name).toBe('old');
        });

        it('updates project fields', () => {
            db.insertProject({ name: 'app', path: '/app', type: 'web-app', frameworks: [], lastActive: 0, fileCount: 10 });

            const updated = db.updateProject('/app', { fileCount: 100 });
            expect(updated).toBe(true);

            const project = db.getProject('/app');
            expect(project?.fileCount).toBe(100);
        });

        it('returns false when updating non-existent project', () => {
            const updated = db.updateProject('/nonexistent', { fileCount: 100 });
            expect(updated).toBe(false);
        });

        it('deletes project', () => {
            db.insertProject({ name: 'app', path: '/app', type: 'web-app', frameworks: [], lastActive: 0, fileCount: 10 });

            const deleted = db.deleteProject('/app');
            expect(deleted).toBe(true);
            expect(db.getProject('/app')).toBeNull();
        });
    });

    describe('Code Patterns', () => {
        it('inserts and retrieves pattern', () => {
            const pattern: CodePattern = {
                pattern: 'useAuth()',
                description: 'Authentication hook pattern',
                files: ['src/hooks/useAuth.ts'],
                frequency: 5,
                category: 'auth',
            };

            const id = db.insertCodePattern(pattern);
            expect(id).toBeGreaterThan(0);

            const patterns = db.getCodePatterns();
            expect(patterns).toHaveLength(1);
            expect(patterns[0].pattern).toBe('useAuth()');
        });

        it('filters by category', () => {
            db.insertCodePattern({ pattern: 'auth', description: '', files: [], frequency: 1, category: 'auth' });
            db.insertCodePattern({ pattern: 'api', description: '', files: [], frequency: 1, category: 'api-call' });

            const authPatterns = db.getCodePatterns('auth');
            expect(authPatterns).toHaveLength(1);
            expect(authPatterns[0].category).toBe('auth');
        });

        it('orders by frequency', () => {
            db.insertCodePattern({ pattern: 'low', description: '', files: [], frequency: 1, category: 'other' });
            db.insertCodePattern({ pattern: 'high', description: '', files: [], frequency: 10, category: 'other' });

            const patterns = db.getCodePatterns();
            expect(patterns[0].pattern).toBe('high');
        });

        it('increments frequency', () => {
            db.insertCodePattern({ pattern: 'test', description: '', files: [], frequency: 5, category: 'other' });

            const incremented = db.incrementPatternFrequency(1);
            expect(incremented).toBe(true);

            const patterns = db.getCodePatterns();
            expect(patterns[0].frequency).toBe(6);
        });
    });

    describe('Statistics', () => {
        it('returns correct counts', () => {
            db.insertProject({ name: 'a', path: '/a', type: 'web-app', frameworks: [], lastActive: 0, fileCount: 0 });
            db.insertProject({ name: 'b', path: '/b', type: 'backend', frameworks: [], lastActive: 0, fileCount: 0 });
            db.insertCodePattern({ pattern: 'p', description: '', files: [], frequency: 1, category: 'other' });

            const stats = db.getContextStats();
            expect(stats.totalProjects).toBe(2);
            expect(stats.totalPatterns).toBe(1);
        });
    });
});
