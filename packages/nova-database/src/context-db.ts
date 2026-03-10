/**
 * Context Database Service
 * Manages project context and code patterns using better-sqlite3
 */

import Database from 'better-sqlite3';
import type { ProjectContext, CodePattern } from '@nova/types';
import { resolve } from 'path';

const DB_PATH = process.env.NOVA_CONTEXT_DB_PATH ?? 'D:\\databases\\nova_context.db';

interface ProjectRow {
  name: string;
  path: string;
  type: ProjectContext['type'];
  frameworks: string;
  last_active: number;
  file_count: number;
}

interface CodePatternRow {
  id: number;
  pattern: string;
  description: string;
  files: string;
  frequency: number;
  category: CodePattern['category'];
}

export class ContextDatabase {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    const resolvedPath = dbPath === ':memory:' ? ':memory:' : resolve(dbPath);
    this.db = new Database(resolvedPath);
    this.initSchema();
  }

  private initSchema() {
    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('web-app', 'desktop-app', 'mobile-app', 'backend', 'library', 'other')),
        frameworks TEXT NOT NULL DEFAULT '[]',
        last_active INTEGER NOT NULL,
        file_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
      CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active DESC);
    `);

    // Code patterns table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        description TEXT NOT NULL,
        files TEXT NOT NULL DEFAULT '[]',
        frequency INTEGER NOT NULL DEFAULT 1,
        category TEXT NOT NULL CHECK(category IN ('auth', 'api-call', 'error-handling', 'config', 'other'))
      );

      CREATE INDEX IF NOT EXISTS idx_code_patterns_category ON code_patterns(category);
      CREATE INDEX IF NOT EXISTS idx_code_patterns_frequency ON code_patterns(frequency DESC);
    `);
  }

  // Project operations
  insertProject(project: ProjectContext): number {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, path, type, frameworks, last_active, file_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        frameworks = excluded.frameworks,
        last_active = excluded.last_active,
        file_count = excluded.file_count
    `);
    const result = stmt.run(
      project.name,
      project.path,
      project.type,
      JSON.stringify(project.frameworks),
      project.lastActive,
      project.fileCount
    );
    return Number(result.lastInsertRowid);
  }

  getProject(path: string): ProjectContext | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE path = ?');
    const row = stmt.get(path) as ProjectRow | undefined;

    if (!row) return null;

    return {
      name: row.name,
      path: row.path,
      type: row.type,
      frameworks: JSON.parse(row.frameworks),
      lastActive: row.last_active,
      fileCount: row.file_count
    };
  }

  getAllProjects(): ProjectContext[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY last_active DESC');
    const rows = stmt.all() as ProjectRow[];

    return rows.map(row => ({
      name: row.name,
      path: row.path,
      type: row.type,
      frameworks: JSON.parse(row.frameworks),
      lastActive: row.last_active,
      fileCount: row.file_count
    }));
  }

  updateProject(path: string, updates: Partial<ProjectContext>): boolean {
    const existing = this.getProject(path);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.insertProject(updated);
    return true;
  }

  deleteProject(path: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE path = ?');
    const result = stmt.run(path);
    return result.changes > 0;
  }

  // Code pattern operations
  insertCodePattern(pattern: CodePattern): number {
    const stmt = this.db.prepare(`
      INSERT INTO code_patterns (pattern, description, files, frequency, category)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      pattern.pattern,
      pattern.description,
      JSON.stringify(pattern.files),
      pattern.frequency,
      pattern.category
    );
    return Number(result.lastInsertRowid);
  }

  getCodePatterns(category?: CodePattern['category']): CodePattern[] {
    let query = 'SELECT * FROM code_patterns';
    const params: CodePattern['category'][] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY frequency DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as CodePatternRow[];

    return rows.map(row => ({
      id: row.id,
      pattern: row.pattern,
      description: row.description,
      files: JSON.parse(row.files),
      frequency: row.frequency,
      category: row.category
    }));
  }

  incrementPatternFrequency(id: number): boolean {
    const stmt = this.db.prepare('UPDATE code_patterns SET frequency = frequency + 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Statistics
  getContextStats() {
    const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const patternCount = this.db.prepare('SELECT COUNT(*) as count FROM code_patterns').get() as { count: number };

    return {
      totalProjects: projectCount.count,
      totalPatterns: patternCount.count
    };
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
let contextDb: ContextDatabase | null = null;

export function getContextDatabase(): ContextDatabase {
  contextDb ??= new ContextDatabase();
  return contextDb;
}
