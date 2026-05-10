#!/usr/bin/env node
/**
 * Memory Plan — Capture a plan artifact as procedural memory
 * Stores plan metadata, key decisions, constraints, and acceptance criteria
 * so that execution agents can retrieve the plan context later.
 */

const fs = require('fs');
const path = require('path');
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
  const result = { planFile: '', agent: 'planner', scope: '', status: 'draft' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1] || '';
    if (key === '--plan-file') result.planFile = val;
    if (key === '--agent') result.agent = val;
    if (key === '--scope') result.scope = val;
    if (key === '--status') result.status = val;
  }
  return result;
}

function extractPlanMetadata(content) {
  // Extract key sections from markdown plan files
  const metadata = {
    title: '',
    acceptanceCriteria: [],
    decisions: [],
    constraints: [],
    dependencies: [],
  };

  // Try to find title (first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) metadata.title = titleMatch[1].trim();

  // Extract acceptance criteria
  const acMatch = content.match(/##\s*(?:Acceptance Criteria|Criteria|Done|Definition of Done)\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (acMatch) {
    metadata.acceptanceCriteria = acMatch[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
  }

  // Extract decisions
  const decMatch = content.match(/##\s*(?:Decisions|Architecture Decisions|Key Decisions)\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (decMatch) {
    metadata.decisions = decMatch[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
  }

  // Extract constraints
  const conMatch = content.match(/##\s*(?:Constraints|Limitations|Constraints & Assumptions)\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (conMatch) {
    metadata.constraints = conMatch[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
  }

  // Extract dependencies
  const depMatch = content.match(/##\s*(?:Dependencies|Prerequisites|Blocked By)\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (depMatch) {
    metadata.dependencies = depMatch[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
  }

  return metadata;
}

function main() {
  const opts = parseArgs();

  if (!opts.planFile) {
    console.error('Usage: node memory-plan.cjs --plan-file <path> [--agent planner] [--scope feature-name] [--status draft|approved|in-progress|completed]');
    process.exit(1);
  }

  const content = readFileSafe(opts.planFile);
  if (!content) {
    console.error(`Plan file not found: ${opts.planFile}`);
    process.exit(1);
  }

  const metadata = extractPlanMetadata(content);
  const ts = Math.floor(Date.now() / 1000);
  const db = new Database(DB_PATH);

  // Store as procedural memory (workflow/pattern)
  const planSummary = metadata.title || path.basename(opts.planFile);
  const proceduralText = `Plan: ${planSummary}\nScope: ${opts.scope || 'unspecified'}\nStatus: ${opts.status}\nFile: ${opts.planFile}\n\nDecisions:\n${metadata.decisions.map(d => `- ${d}`).join('\n')}\n\nConstraints:\n${metadata.constraints.map(c => `- ${c}`).join('\n')}`;

  db.prepare(
    `INSERT INTO procedural_memory (pattern, context, frequency, success_rate, last_used, metadata)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(pattern) DO UPDATE SET
       context = excluded.context,
       frequency = frequency + 1,
       last_used = excluded.last_used,
       metadata = excluded.metadata`
  ).run(
    `plan:${opts.scope || planSummary}`,
    proceduralText,
    1,
    0.0, // success rate unknown until verified
    ts,
    JSON.stringify({
      planFile: opts.planFile,
      agent: opts.agent,
      scope: opts.scope,
      status: opts.status,
      title: metadata.title,
      acceptanceCriteria: metadata.acceptanceCriteria,
      decisions: metadata.decisions,
      constraints: metadata.constraints,
      dependencies: metadata.dependencies,
      createdAt: ts,
    })
  );

  // Also store key decisions as semantic memories for retrieval
  for (const decision of metadata.decisions) {
    db.prepare(
      `INSERT INTO semantic_memory (text, category, importance, created, last_accessed, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      `[Plan: ${planSummary}] ${decision}`,
      'decision',
      8,
      ts, ts,
      'plan-extraction'
    );
  }

  // Store constraints as semantic memories
  for (const constraint of metadata.constraints) {
    db.prepare(
      `INSERT INTO semantic_memory (text, category, importance, created, last_accessed, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      `[Plan: ${planSummary}] Constraint: ${constraint}`,
      'constraint',
      9,
      ts, ts,
      'plan-extraction'
    );
  }

  db.close();

  console.log(`Plan captured: ${planSummary}`);
  console.log(`  Scope: ${opts.scope || 'unspecified'}`);
  console.log(`  Status: ${opts.status}`);
  console.log(`  Decisions: ${metadata.decisions.length}`);
  console.log(`  Constraints: ${metadata.constraints.length}`);
  console.log(`  Acceptance criteria: ${metadata.acceptanceCriteria.length}`);
}

main();
