#!/usr/bin/env node
/**
 * Memory Handoff — Session end structured handoff
 * Writes next-session-prompt.md + episodic memory + progress update.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';
const MEMORY_BANK = 'memory-bank';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { summary: '', decisions: '', blockers: '', nextSteps: '' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1] || '';
    if (key === '--summary') result.summary = val;
    if (key === '--decisions') result.decisions = val;
    if (key === '--blockers') result.blockers = val;
    if (key === '--next-steps') result.nextSteps = val;
  }
  return result;
}

function main() {
  const opts = parseArgs();

  if (!opts.summary) {
    console.error('Usage: node memory-handoff.cjs --summary "..." --decisions "..." --blockers "..." --next-steps "..."');
    process.exit(1);
  }

  const ts = Math.floor(Date.now() / 1000);
  const sessionId = process.env.KIMI_SESSION_ID || process.env.CLAUDE_SESSION_ID || `handoff-${ts}`;

  // 1. Write next-session-prompt.md
  const handoffPath = path.join(MEMORY_BANK, 'next-session-prompt.md');
  const handoffContent = `# Session Handoff

**Generated**: ${new Date().toISOString()}  
**Session**: ${sessionId}

## What Was Being Worked On
${opts.summary}

## Decisions Made
${opts.decisions || 'None recorded.'}

## Current Blockers
${opts.blockers || 'None.'}

## Exact Next Steps to Resume
${opts.nextSteps || 'No specific next steps recorded.'}

## Relevant Files
<!-- Add file paths and line numbers here if known -->
`;

  fs.writeFileSync(handoffPath, handoffContent, 'utf8');

  // 2. Add episodic memory
  const db = new Database(DB_PATH);
  db.prepare(
    `INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'memory-handoff',
    ts,
    opts.summary,
    `Decisions: ${opts.decisions || 'none'}. Next: ${opts.nextSteps || 'none'}`,
    sessionId,
    JSON.stringify({ blockers: opts.blockers, type: 'session-handoff' })
  );

  // 3. Update progress.md if work seems complete (no blockers + no next steps)
  const progressPath = path.join(MEMORY_BANK, 'progress.md');
  if (!opts.blockers && !opts.nextSteps) {
    const progressEntry = `\n## ${new Date().toISOString().slice(0, 10)}\n- **Completed**: ${opts.summary}\n`;
    try {
      fs.appendFileSync(progressPath, progressEntry, 'utf8');
    } catch {
      // progress.md might not exist yet
    }
  }

  db.close();
  console.log('Session handoff written.');
  console.log(`  - ${handoffPath}`);
  console.log(`  - Episodic memory added (session=${sessionId})`);
}

main();
