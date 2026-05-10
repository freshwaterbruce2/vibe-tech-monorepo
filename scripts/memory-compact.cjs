#!/usr/bin/env node
/**
 * Memory Compact — Checkpoint before context window compression
 * Saves task state so it survives context compaction.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';
const MEMORY_BANK = 'memory-bank';

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { task: '', decisions: '', remaining: '', blockers: '' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1] || '';
    if (key === '--task') result.task = val;
    if (key === '--decisions') result.decisions = val;
    if (key === '--remaining') result.remaining = val;
    if (key === '--blockers') result.blockers = val;
  }
  return result;
}

function main() {
  const opts = parseArgs();
  const ts = Math.floor(Date.now() / 1000);
  const sessionId = process.env.KIMI_SESSION_ID || process.env.CLAUDE_SESSION_ID || `compact-${ts}`;

  // Read current active context
  const activeCtx = readFileSafe(path.join(MEMORY_BANK, 'activeContext.md'));

  // Build checkpoint content
  const checkpoint = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    task: opts.task || 'Unknown',
    decisions: opts.decisions || 'None recorded',
    remaining_work: opts.remaining || 'Unknown',
    blockers: opts.blockers || 'None',
    previous_context: activeCtx.slice(0, 2000),
  };

  // Write compact checkpoint to DB as episodic memory with special metadata
  const db = new Database(DB_PATH);
  db.prepare(
    `INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'memory-compact',
    ts,
    `Compact checkpoint: ${opts.task || 'ongoing work'}`,
    `Decisions: ${opts.decisions || 'none'}. Remaining: ${opts.remaining || 'unknown'}. Blockers: ${opts.blockers || 'none'}`,
    sessionId,
    JSON.stringify({ type: 'compact-checkpoint', checkpoint })
  );

  db.close();

  console.log('Compact checkpoint saved.');
  console.log(`  Task: ${checkpoint.task}`);
  console.log(`  Remaining: ${checkpoint.remaining_work}`);
  console.log(`  Blockers: ${checkpoint.blockers}`);
}

main();
