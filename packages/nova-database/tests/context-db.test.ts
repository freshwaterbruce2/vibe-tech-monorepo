/**
 * Tests for ContextDatabase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextDatabase } from '../src/context-db.js';

describe('ContextDatabase', () => {
  let db: ContextDatabase;

  beforeEach(() => {
    db = new ContextDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('Projects', () => {
    it('should insert and retrieve project', () => {
      const project = {
        name: 'test-app',
        path: 'C:\\dev\\apps\\test-app',
        type: 'web-app' as const,
        frameworks: ['react', 'typescript'],
        lastActive: Date.now(),
        fileCount: 50
      };

      const id = db.insertProject(project);
      expect(id).toBeGreaterThan(0);

      const retrieved = db.getProject(project.path);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe(project.name);
      expect(retrieved!.frameworks).toEqual(project.frameworks);
    });

    it('should upsert project on conflict', () => {
      const project = {
        name: 'test-app',
        path: 'C:\\dev\\apps\\test-app',
        type: 'web-app' as const,
        frameworks: ['react'],
        lastActive: Date.now(),
        fileCount: 50
      };

      db.insertProject(project);
      
      const updated = { ...project, fileCount: 100 };
      db.insertProject(updated);

      const all = db.getAllProjects();
      expect(all).toHaveLength(1);
      expect(all[0].fileCount).toBe(100);
    });

    it('should get all projects sorted by lastActive', () => {
      const now = Date.now();
      
      db.insertProject({
        name: 'old-project',
        path: 'C:\\dev\\apps\\old',
        type: 'backend' as const,
        frameworks: [],
        lastActive: now - 10000,
        fileCount: 10
      });

      db.insertProject({
        name: 'new-project',
        path: 'C:\\dev\\apps\\new',
        type: 'web-app' as const,
        frameworks: [],
        lastActive: now,
        fileCount: 20
      });

      const projects = db.getAllProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('new-project');
    });

    it('should update project', () => {
      db.insertProject({
        name: 'test-app',
        path: 'C:\\dev\\apps\\test',
        type: 'web-app' as const,
        frameworks: ['react'],
        lastActive: Date.now(),
        fileCount: 50
      });

      const success = db.updateProject('C:\\dev\\apps\\test', { fileCount: 100 });
      expect(success).toBe(true);

      const updated = db.getProject('C:\\dev\\apps\\test');
      expect(updated!.fileCount).toBe(100);
    });

    it('should return false when updating non-existent project', () => {
      const success = db.updateProject('C:\\nonexistent', { fileCount: 100 });
      expect(success).toBe(false);
    });

    it('should delete project', () => {
      db.insertProject({
        name: 'test-app',
        path: 'C:\\dev\\apps\\test',
        type: 'web-app' as const,
        frameworks: [],
        lastActive: Date.now(),
        fileCount: 50
      });

      const success = db.deleteProject('C:\\dev\\apps\\test');
      expect(success).toBe(true);

      const retrieved = db.getProject('C:\\dev\\apps\\test');
      expect(retrieved).toBeNull();
    });
  });

  describe('Code Patterns', () => {
    it('should insert and retrieve code pattern', () => {
      const pattern = {
        pattern: 'useAuth()',
        description: 'Authentication hook usage',
        files: ['auth.ts', 'login.tsx'],
        frequency: 5,
        category: 'auth' as const
      };

      const id = db.insertCodePattern(pattern);
      expect(id).toBeGreaterThan(0);

      const patterns = db.getCodePatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe(pattern.pattern);
      expect(patterns[0].files).toEqual(pattern.files);
    });

    it('should filter patterns by category', () => {
      db.insertCodePattern({
        pattern: 'useAuth()',
        description: 'Auth',
        files: [],
        frequency: 1,
        category: 'auth'
      });

      db.insertCodePattern({
        pattern: 'fetch()',
        description: 'API call',
        files: [],
        frequency: 1,
        category: 'api-call'
      });

      const authPatterns = db.getCodePatterns('auth');
      expect(authPatterns).toHaveLength(1);
      expect(authPatterns[0].category).toBe('auth');
    });

    it('should increment pattern frequency', () => {
      const id = db.insertCodePattern({
        pattern: 'test',
        description: 'Test',
        files: [],
        frequency: 1,
        category: 'other'
      });

      db.incrementPatternFrequency(id);
      db.incrementPatternFrequency(id);

      const patterns = db.getCodePatterns();
      expect(patterns[0].frequency).toBe(3);
    });
  });

  describe('Statistics', () => {
    it('should return correct context stats', () => {
      db.insertProject({
        name: 'test',
        path: 'C:\\test',
        type: 'web-app' as const,
        frameworks: [],
        lastActive: Date.now(),
        fileCount: 0
      });

      db.insertCodePattern({
        pattern: 'test',
        description: 'test',
        files: [],
        frequency: 1,
        category: 'other'
      });

      const stats = db.getContextStats();
      expect(stats.totalProjects).toBe(1);
      expect(stats.totalPatterns).toBe(1);
    });
  });
});
