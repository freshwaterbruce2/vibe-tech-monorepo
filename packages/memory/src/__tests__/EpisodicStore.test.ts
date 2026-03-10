import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EpisodicStore } from '../stores/EpisodicStore.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-episodic-test.db');

describe('EpisodicStore', () => {
  let dbManager: DatabaseManager;
  let store: EpisodicStore;

  beforeEach(async () => {
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    store = new EpisodicStore(dbManager.getDb());
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const walPath = TEST_DB_PATH + '-wal';
    const shmPath = TEST_DB_PATH + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  it('should add and retrieve episodic memory', () => {
    const id = store.add({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'How do I implement a linked list?',
      response: 'Here is a linked list implementation...',
    });

    expect(id).toBeGreaterThan(0);
    expect(store.count()).toBe(1);

    const recent = store.getRecent(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].query).toBe('How do I implement a linked list?');
    expect(recent[0].sourceId).toBe('claude-code');
  });

  it('should filter by sourceId', () => {
    store.add({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'question 1',
      response: 'answer 1',
    });
    store.add({
      sourceId: 'gemini-cli',
      timestamp: Date.now(),
      query: 'question 2',
      response: 'answer 2',
    });

    const claudeOnly = store.getRecent(10, 'claude-code');
    expect(claudeOnly).toHaveLength(1);
    expect(claudeOnly[0].sourceId).toBe('claude-code');
  });

  it('should search episodic memories by text', () => {
    store.add({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'How to fix TypeScript error?',
      response: 'Check your tsconfig...',
    });
    store.add({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'What is Python?',
      response: 'Python is a programming language...',
    });

    const results = store.search('TypeScript');
    expect(results).toHaveLength(1);
    expect(results[0].item.query).toContain('TypeScript');
  });

  it('should get memory by ID', () => {
    const id = store.add({
      sourceId: 'test',
      timestamp: Date.now(),
      query: 'test query',
      response: 'test response',
      metadata: { project: 'vibe-tutor' },
    });

    const memory = store.getById(id);
    expect(memory).not.toBeNull();
    expect(memory!.query).toBe('test query');
    expect(memory!.metadata).toEqual({ project: 'vibe-tutor' });
  });

  it('should delete old memories', () => {
    // Add old memory (30 days ago)
    store.add({
      sourceId: 'test',
      timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
      query: 'old query',
      response: 'old response',
    });
    // Add recent memory
    store.add({
      sourceId: 'test',
      timestamp: Date.now(),
      query: 'new query',
      response: 'new response',
    });

    const deleted = store.deleteOlderThan(7); // delete older than 7 days
    expect(deleted).toBe(1);
    expect(store.count()).toBe(1);
  });
});
