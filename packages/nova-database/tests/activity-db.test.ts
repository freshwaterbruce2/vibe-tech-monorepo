/**
 * Tests for ActivityDatabase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ActivityDatabase } from '../src/activity-db.js';

describe('ActivityDatabase', () => {
  let db: ActivityDatabase;

  beforeEach(() => {
    db = new ActivityDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('File Events', () => {
    it('should insert and retrieve file event', () => {
      const event = {
        path: 'C:\\dev\\test.ts',
        eventType: 'create' as const,
        timestamp: Date.now(),
        project: 'test-project'
      };

      const id = db.insertFileEvent(event);
      expect(id).toBeGreaterThan(0);

      const events = db.getFileEvents();
      expect(events).toHaveLength(1);
      expect(events[0].path).toBe(event.path);
      expect(events[0].eventType).toBe(event.eventType);
    });

    it('should filter file events by time range', () => {
      const now = Date.now();
      
      db.insertFileEvent({ path: 'old.ts', eventType: 'create', timestamp: now - 100000 });
      db.insertFileEvent({ path: 'new.ts', eventType: 'create', timestamp: now });

      const filtered = db.getFileEvents({ startTime: now - 50000 });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].path).toBe('new.ts');
    });

    it('should filter file events by project', () => {
      db.insertFileEvent({ path: 'a.ts', eventType: 'create', timestamp: Date.now(), project: 'project-a' });
      db.insertFileEvent({ path: 'b.ts', eventType: 'create', timestamp: Date.now(), project: 'project-b' });

      const filtered = db.getFileEvents({ projects: ['project-a'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].project).toBe('project-a');
    });
  });

  describe('Git Events', () => {
    it('should insert and retrieve git event', () => {
      const event = {
        repoPath: 'C:\\dev',
        eventType: 'commit' as const,
        branch: 'main',
        commitHash: 'abc123',
        message: 'Test commit',
        author: 'Test Author',
        timestamp: Date.now()
      };

      const id = db.insertGitEvent(event);
      expect(id).toBeGreaterThan(0);

      const events = db.getGitEvents();
      expect(events).toHaveLength(1);
      expect(events[0].commitHash).toBe(event.commitHash);
    });
  });

  describe('Process Events', () => {
    it('should insert and retrieve process event', () => {
      const event = {
        name: 'node',
        pid: 1234,
        eventType: 'start' as const,
        port: 3000,
        commandLine: 'node server.js',
        project: 'test-project',
        timestamp: Date.now()
      };

      const id = db.insertProcessEvent(event);
      expect(id).toBeGreaterThan(0);

      const events = db.getProcessEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe(event.name);
      expect(events[0].port).toBe(event.port);
    });
  });

  describe('Statistics', () => {
    it('should return correct activity stats', () => {
      db.insertFileEvent({ path: 'a.ts', eventType: 'create', timestamp: Date.now() });
      db.insertFileEvent({ path: 'b.ts', eventType: 'modify', timestamp: Date.now() });
      db.insertGitEvent({ repoPath: 'C:\\dev', eventType: 'commit', timestamp: Date.now() });
      db.insertProcessEvent({ name: 'node', pid: 1, eventType: 'start', timestamp: Date.now() });

      const stats = db.getActivityStats();
      expect(stats.totalFileEvents).toBe(2);
      expect(stats.totalGitEvents).toBe(1);
      expect(stats.totalProcessEvents).toBe(1);
      expect(stats.totalEvents).toBe(4);
    });
  });

  describe('Cleanup', () => {
    it('should remove old events', () => {
      const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      const newTime = Date.now();

      db.insertFileEvent({ path: 'old.ts', eventType: 'create', timestamp: oldTime });
      db.insertFileEvent({ path: 'new.ts', eventType: 'create', timestamp: newTime });

      db.cleanupOldEvents(30);

      const events = db.getFileEvents();
      expect(events).toHaveLength(1);
      expect(events[0].path).toBe('new.ts');
    });
  });
});
