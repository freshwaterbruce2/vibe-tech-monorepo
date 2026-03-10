import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ActivityDatabase } from './activity-db';
import type { FileEvent, GitEvent, ProcessEvent } from '@nova/types';

describe('ActivityDatabase', () => {
    let db: ActivityDatabase;

    beforeEach(() => {
        db = new ActivityDatabase(':memory:');
    });

    afterEach(() => {
        db.close();
    });

    describe('File Events', () => {
        it('inserts and retrieves file event', () => {
            const event: FileEvent = {
                path: 'C:\\dev\\test.ts',
                eventType: 'create',
                timestamp: Date.now(),
                project: 'test-project',
            };

            const id = db.insertFileEvent(event);
            expect(id).toBeGreaterThan(0);

            const events = db.getFileEvents();
            expect(events).toHaveLength(1);
            expect(events[0].path).toBe('C:\\dev\\test.ts');
            expect(events[0].eventType).toBe('create');
        });

        it('filters by time range', () => {
            const now = Date.now();
            db.insertFileEvent({ path: 'old.ts', eventType: 'create', timestamp: now - 10000 });
            db.insertFileEvent({ path: 'new.ts', eventType: 'modify', timestamp: now });

            const filtered = db.getFileEvents({ startTime: now - 5000 });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].path).toBe('new.ts');
        });

        it('filters by project', () => {
            db.insertFileEvent({ path: 'a.ts', eventType: 'create', timestamp: Date.now(), project: 'proj-a' });
            db.insertFileEvent({ path: 'b.ts', eventType: 'create', timestamp: Date.now(), project: 'proj-b' });

            const filtered = db.getFileEvents({ projects: ['proj-a'] });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].project).toBe('proj-a');
        });

        it('filters by search query', () => {
            db.insertFileEvent({ path: 'src/utils.ts', eventType: 'create', timestamp: Date.now() });
            db.insertFileEvent({ path: 'test/utils.test.ts', eventType: 'create', timestamp: Date.now() });

            const filtered = db.getFileEvents({ searchQuery: 'test' });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].path).toContain('test');
        });

        it('handles rename events with oldPath', () => {
            const event: FileEvent = {
                path: 'new-name.ts',
                eventType: 'rename',
                timestamp: Date.now(),
                oldPath: 'old-name.ts',
            };

            db.insertFileEvent(event);
            const events = db.getFileEvents();
            expect(events[0].oldPath).toBe('old-name.ts');
        });
    });

    describe('Git Events', () => {
        it('inserts and retrieves git event', () => {
            const event: GitEvent = {
                repoPath: 'C:\\dev',
                eventType: 'commit',
                branch: 'main',
                commitHash: 'abc123',
                message: 'Initial commit',
                author: 'dev@test.com',
                timestamp: Date.now(),
            };

            const id = db.insertGitEvent(event);
            expect(id).toBeGreaterThan(0);

            const events = db.getGitEvents();
            expect(events).toHaveLength(1);
            expect(events[0].eventType).toBe('commit');
            expect(events[0].commitHash).toBe('abc123');
        });

        it('filters by time range', () => {
            const now = Date.now();
            db.insertGitEvent({ repoPath: '.', eventType: 'commit', branch: 'main', timestamp: now - 10000 });
            db.insertGitEvent({ repoPath: '.', eventType: 'push', branch: 'main', timestamp: now });

            const filtered = db.getGitEvents({ startTime: now - 5000 });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].eventType).toBe('push');
        });

        it('handles all git event types', () => {
            const types: GitEvent['eventType'][] = [
                'commit', 'checkout', 'merge', 'pull', 'push', 'branch-create', 'branch-delete'
            ];

            types.forEach((t, i) => {
                db.insertGitEvent({ repoPath: '.', eventType: t, branch: 'test', timestamp: Date.now() + i });
            });

            const events = db.getGitEvents();
            expect(events).toHaveLength(7);
        });
    });

    describe('Process Events', () => {
        it('inserts and retrieves process event', () => {
            const event: ProcessEvent = {
                name: 'node',
                pid: 1234,
                eventType: 'start',
                port: 3000,
                commandLine: 'node server.js',
                project: 'my-app',
                timestamp: Date.now(),
            };

            const id = db.insertProcessEvent(event);
            expect(id).toBeGreaterThan(0);

            const events = db.getProcessEvents();
            expect(events).toHaveLength(1);
            expect(events[0].name).toBe('node');
            expect(events[0].port).toBe(3000);
        });

        it('filters by project', () => {
            db.insertProcessEvent({ name: 'vite', pid: 1, eventType: 'start', timestamp: Date.now(), project: 'app-a' });
            db.insertProcessEvent({ name: 'tsc', pid: 2, eventType: 'start', timestamp: Date.now(), project: 'app-b' });

            const filtered = db.getProcessEvents({ projects: ['app-a'] });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].name).toBe('vite');
        });
    });

    describe('Cleanup', () => {
        it('removes old events', () => {
            const now = Date.now();
            const oldTime = now - (31 * 24 * 60 * 60 * 1000); // 31 days ago

            db.insertFileEvent({ path: 'old.ts', eventType: 'create', timestamp: oldTime });
            db.insertFileEvent({ path: 'new.ts', eventType: 'create', timestamp: now });

            db.cleanupOldEvents(30);

            const events = db.getFileEvents();
            expect(events).toHaveLength(1);
            expect(events[0].path).toBe('new.ts');
        });
    });

    describe('Statistics', () => {
        it('returns correct counts', () => {
            db.insertFileEvent({ path: 'a.ts', eventType: 'create', timestamp: Date.now() });
            db.insertFileEvent({ path: 'b.ts', eventType: 'modify', timestamp: Date.now() });
            db.insertGitEvent({ repoPath: '.', eventType: 'commit', branch: 'main', timestamp: Date.now() });
            db.insertProcessEvent({ name: 'node', pid: 1, eventType: 'start', timestamp: Date.now() });

            const stats = db.getActivityStats();
            expect(stats.totalFileEvents).toBe(2);
            expect(stats.totalGitEvents).toBe(1);
            expect(stats.totalProcessEvents).toBe(1);
            expect(stats.totalEvents).toBe(4);
        });
    });
});
