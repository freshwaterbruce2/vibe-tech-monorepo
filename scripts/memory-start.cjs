#!/usr/bin/env node
/**
 * Memory Start — Session startup memory review
 * Reads Memory Bank + recent DB entries + active plans + procedural workflows,
 * prints token-budgeted summary.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';
const MEMORY_BANK = 'memory-bank';
const PLANS_DIR = 'docs/plans';
const TOKEN_BUDGET = 2000; // ~2000 chars of output

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return null;
  }
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function truncateToBudget(parts, budgetChars) {
  const result = [];
  let remaining = budgetChars;
  for (const part of parts) {
    if (remaining <= 0) break;
    const text = part.text;
    if (text.length > remaining) {
      result.push({ label: part.label, text: text.slice(0, remaining) + '...' });
      remaining = 0;
    } else {
      result.push(part);
      remaining -= text.length;
    }
  }
  return result;
}

function getGitContext() {
  try {
    const { execSync } = require('child_process');
    const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: 'V:/monorepo' }).trim();
    return { branch };
  } catch {
    return { branch: 'unknown' };
  }
}

function findActivePlans() {
  const plans = [];
  try {
    const entries = fs.readdirSync(PLANS_DIR);
    for (const entry of entries) {
      if (entry.endsWith('.md')) {
        const content = readFileSafe(path.join(PLANS_DIR, entry));
        if (content) {
          // Check if plan has a status indicator (flexible markdown formatting)
          const statusLineMatch = content.match(/(?:\*\*)?\b[Ss]tatus\b(?:\*\*)?\s*[:：]\s*(.+?)(?:\*\*)?$/im);
          const statusLine = statusLineMatch ? statusLineMatch[1].trim().toLowerCase() : '';
          const status = statusLine.includes('completed') ? 'completed' :
                         statusLine.includes('draft') ? 'draft' :
                         statusLine.includes('approved') ? 'approved' :
                         statusLine.includes('in-progress') ? 'in-progress' : 'unknown';
          if (status !== 'completed') {
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : entry;
            plans.push({ file: entry, title, status, content });
          }
        }
      }
    }
  } catch {
    // plans dir might not exist
  }
  return plans;
}

function main() {
  const db = new Database(DB_PATH);
  const gitCtx = getGitContext();
  const parts = [];

  // 1. Read next-session-prompt.md (highest priority — resume instruction)
  const handoff = readFileSafe(path.join(MEMORY_BANK, 'next-session-prompt.md'));
  if (handoff && handoff.length > 50 && !handoff.includes('(no handoff yet)')) {
    parts.push({ label: 'SESSION HANDOFF', text: handoff });
  }

  // 2. Read activeContext.md
  const activeCtx = readFileSafe(path.join(MEMORY_BANK, 'activeContext.md'));
  if (activeCtx) {
    parts.push({ label: 'ACTIVE CONTEXT', text: activeCtx });
  }

  // 3. Active plans (from docs/plans/)
  const activePlans = findActivePlans();
  if (activePlans.length > 0) {
    let text = 'Active plans (not completed):\n';
    for (const plan of activePlans.slice(0, 3)) {
      text += `- [${plan.status.toUpperCase()}] ${plan.title} (${plan.file})\n`;
      // Include first 300 chars of the plan
      const preview = plan.content.slice(0, 300).replace(/\n/g, ' ');
      text += `  Preview: ${preview}${plan.content.length > 300 ? '...' : ''}\n`;
    }
    parts.push({ label: 'ACTIVE PLANS', text });
  }

  // 4. Procedural workflows (recent patterns)
  const oneWeekAgo = Math.floor(Date.now() / 1000) - 604800;
  const workflows = db.prepare(
    `SELECT pattern, frequency, success_rate, metadata
     FROM procedural_memory
     WHERE last_used > ? AND pattern LIKE 'plan:%'
     ORDER BY last_used DESC
     LIMIT 3`
  ).all(oneWeekAgo);

  if (workflows.length > 0) {
    let text = 'Recent plan workflows:\n';
    for (const wf of workflows) {
      const meta = wf.metadata ? JSON.parse(wf.metadata) : {};
      text += `- ${wf.pattern} (freq=${wf.frequency}, success=${Math.round((wf.success_rate || 0) * 100)}%)\n`;
      if (meta.title) text += `  Title: ${meta.title}\n`;
      if (meta.status) text += `  Status: ${meta.status}\n`;
    }
    parts.push({ label: 'PROCEDURAL WORKFLOWS', text });
  }

  // 5. Recent episodic memories (last 24h)
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const recentEpisodic = db.prepare(
    `SELECT timestamp, query, response
     FROM episodic_memory
     WHERE timestamp > ?
     ORDER BY timestamp DESC
     LIMIT 5`
  ).all(oneDayAgo);

  if (recentEpisodic.length > 0) {
    let text = 'Recent sessions (last 24h):\n';
    for (const row of recentEpisodic) {
      const dt = new Date(row.timestamp * 1000).toISOString().slice(0, 16);
      const q = row.query ? row.query.slice(0, 120) : '(no query)';
      const r = row.response ? row.response.slice(0, 120) : '';
      text += `- [${dt}] ${q}${r ? ' | ' + r : ''}\n`;
    }
    parts.push({ label: 'RECENT EPISODIC', text });
  }

  // 6. Semantic memories matching branch or project
  const branchTerm = gitCtx.branch !== 'unknown' ? gitCtx.branch : 'vibetech';
  const semantic = db.prepare(
    `SELECT text, category, importance
     FROM semantic_memory
     WHERE text LIKE ? OR category LIKE ?
     ORDER BY importance DESC, created DESC
     LIMIT 5`
  ).all(`%${branchTerm}%`, `%${branchTerm}%`);

  if (semantic.length > 0) {
    let text = `Relevant knowledge (branch: ${branchTerm}):\n`;
    for (const row of semantic) {
      text += `- [${row.category} | importance=${row.importance}] ${row.text.slice(0, 200)}\n`;
    }
    parts.push({ label: 'SEMANTIC KNOWLEDGE', text });
  }

  db.close();

  // 7. Apply token budget and print
  const budgetChars = TOKEN_BUDGET;
  const trimmed = truncateToBudget(parts, budgetChars);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MEMORY STARTUP CONTEXT                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  for (const part of trimmed) {
    console.log(`## ${part.label}`);
    console.log(part.text);
    console.log('');
  }

  const totalChars = trimmed.reduce((sum, p) => sum + p.text.length, 0);
  console.log(`(Summary: ${trimmed.length} sections, ~${estimateTokens(trimmed.map(p => p.text).join(''))} tokens, ${totalChars} chars)`);

  // 8. Warning if no plan exists for active work
  if (!handoff?.includes('(no handoff yet)') && activePlans.length === 0) {
    console.log('');
    console.log('NOTE: No active plans found in docs/plans/. For complex tasks, consider creating a plan before executing.');
  }
}

main();
