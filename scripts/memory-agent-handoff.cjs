#!/usr/bin/env node
/**
 * Memory Agent Handoff — Record boundary crossings between agents
 * Stores who handed off to whom, with what artifact, and in what state.
 */

const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { from: '', to: '', artifact: '', state: '', task: '' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1] || '';
    if (key === '--from') result.from = val;
    if (key === '--to') result.to = val;
    if (key === '--artifact') result.artifact = val;
    if (key === '--state') result.state = val;
    if (key === '--task') result.task = val;
  }
  return result;
}

function main() {
  const opts = parseArgs();

  if (!opts.from || !opts.to) {
    console.error('Usage: node memory-agent-handoff.cjs --from <agent> --to <agent> [--artifact <path>] [--state "..."] [--task "..."]');
    process.exit(1);
  }

  const ts = Math.floor(Date.now() / 1000);
  const sessionId = process.env.KIMI_SESSION_ID || process.env.CLAUDE_SESSION_ID || `handoff-${ts}`;
  const db = new Database(DB_PATH);

  // Store as episodic memory with agent handoff metadata
  db.prepare(
    `INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'agent-handoff',
    ts,
    `Handoff: ${opts.from} → ${opts.to}${opts.task ? ` | Task: ${opts.task}` : ''}`,
    `State: ${opts.state || 'ongoing'}${opts.artifact ? ` | Artifact: ${opts.artifact}` : ''}`,
    sessionId,
    JSON.stringify({
      type: 'agent-handoff',
      fromAgent: opts.from,
      toAgent: opts.to,
      artifact: opts.artifact,
      state: opts.state,
      task: opts.task,
    })
  );

  // Also track in procedural memory as a workflow pattern
  // This helps identify which agent transitions happen frequently
  const pattern = `handoff:${opts.from}:${opts.to}`;
  const existing = db.prepare('SELECT frequency FROM procedural_memory WHERE pattern = ?').get(pattern);
  if (existing) {
    db.prepare('UPDATE procedural_memory SET frequency = frequency + 1, last_used = ? WHERE pattern = ?').run(ts, pattern);
  } else {
    db.prepare(
      `INSERT INTO procedural_memory (pattern, context, frequency, success_rate, last_used, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      pattern,
      `Handoff: ${opts.from} → ${opts.to}`,
      1,
      0.0,
      ts,
      JSON.stringify({ from: opts.from, to: opts.to, description: `Agent handoff from ${opts.from} to ${opts.to}` })
    );
  }

  db.close();

  console.log(`Agent handoff recorded: ${opts.from} → ${opts.to}`);
  if (opts.artifact) console.log(`  Artifact: ${opts.artifact}`);
  if (opts.state) console.log(`  State: ${opts.state}`);
}

main();
