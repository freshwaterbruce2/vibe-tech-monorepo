#!/usr/bin/env node
/**
 * Memory Verify — Check execution against plan, identify gaps
 * Used by reviewer/critic agents to validate completion and trigger replanning.
 */

const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return null;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { plan: '', outcome: '', gaps: '', verdict: 'incomplete' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1] || '';
    if (key === '--plan') result.plan = val;
    if (key === '--outcome') result.outcome = val;
    if (key === '--gaps') result.gaps = val;
    if (key === '--verdict') result.verdict = val; // pass | fail | incomplete | partial
  }
  return result;
}

function main() {
  const opts = parseArgs();

  if (!opts.plan) {
    console.error('Usage: node memory-verify.cjs --plan <plan-file> --outcome "..." --gaps "..." --verdict <pass|fail|incomplete|partial>');
    process.exit(1);
  }

  const planContent = readFileSafe(opts.plan);
  const ts = Math.floor(Date.now() / 1000);
  const db = new Database(DB_PATH);

  // Extract plan name from file or content
  const planName = opts.plan;

  // Store verification result as episodic memory
  db.prepare(
    `INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'memory-verify',
    ts,
    `Verification: ${planName}`,
    `Verdict: ${opts.verdict}. Outcome: ${opts.outcome || 'none'}. Gaps: ${opts.gaps || 'none'}`,
    `verify-${ts}`,
    JSON.stringify({
      type: 'verification',
      plan: opts.plan,
      verdict: opts.verdict,
      outcome: opts.outcome,
      gaps: opts.gaps,
    })
  );

  // Update procedural memory success rate for this plan type
  const pattern = `plan:${planName}`;
  const proc = db.prepare('SELECT frequency, success_rate FROM procedural_memory WHERE pattern = ?').get(pattern);
  if (proc) {
    const newFreq = proc.frequency + 1;
    const increment = opts.verdict === 'pass' ? 1.0 : opts.verdict === 'partial' ? 0.5 : 0.0;
    const newSuccess = ((proc.success_rate * proc.frequency) + increment) / newFreq;
    db.prepare('UPDATE procedural_memory SET frequency = ?, success_rate = ?, last_used = ? WHERE pattern = ?')
      .run(newFreq, newSuccess, ts, pattern);
  }

  db.close();

  // Print structured report
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION REPORT                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Plan:       ${planName}`);
  console.log(`Verdict:    ${opts.verdict.toUpperCase()}`);
  console.log(`Outcome:    ${opts.outcome || 'N/A'}`);
  if (opts.gaps) {
    console.log(`Gaps:       ${opts.gaps}`);
  }
  console.log('');

  if (opts.verdict === 'fail' || opts.verdict === 'incomplete') {
    console.log('ACTION REQUIRED: Replanning recommended.');
    console.log('Run: node scripts/memory-plan.cjs --plan-file <updated-plan> --status draft');
  } else if (opts.verdict === 'partial') {
    console.log('ACTION: Address gaps before marking complete.');
  } else {
    console.log('Plan verified. Marking as complete.');
  }
}

main();
