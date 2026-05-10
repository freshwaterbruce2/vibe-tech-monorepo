#!/usr/bin/env node
/**
 * Memory Capture — Store an insight during a session
 * Privacy-filters, deduplicates, and writes to the memory DB.
 */

const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';

// Patterns to strip for privacy
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,              // OpenAI/Anthropic keys
  /[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, // JWTs
  /password[=:]\s*\S+/gi,              // password=...
  /api[_-]?key[=:]\s*\S+/gi,           // api_key=...
  /token[=:]\s*\S+/gi,                 // token=...
  /secret[=:]\s*\S+/gi,                // secret=...
  /[a-f0-9]{32,}/gi,                   // hex hashes (potential keys)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
];

function privacyFilter(text) {
  let filtered = text;
  for (const pattern of SECRET_PATTERNS) {
    filtered = filtered.replace(pattern, '[REDACTED]');
  }
  return filtered;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { type: 'general', query: '', response: '', category: 'general', importance: 5 };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1];
    if (key === '--type') result.type = val;
    if (key === '--query') result.query = val;
    if (key === '--response') result.response = val;
    if (key === '--category') result.category = val;
    if (key === '--importance') result.importance = parseInt(val, 10);
  }
  return result;
}

function main() {
  const opts = parseArgs();

  if (!opts.query) {
    console.error('Usage: node memory-capture.cjs --type <decision|pattern|bugfix|learning> --query "..." --response "..." [--category ...] [--importance 5-10]');
    process.exit(1);
  }

  // Privacy filter
  const safeQuery = privacyFilter(opts.query);
  const safeResponse = privacyFilter(opts.response || '');

  // Deduplication: check if identical content exists in last 5 minutes
  const db = new Database(DB_PATH);
  const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
  const contentHash = sha256(safeQuery + '|' + safeResponse);

  const dup = db.prepare(
    `SELECT id FROM episodic_memory WHERE timestamp > ? AND query = ?`
  ).get(fiveMinAgo, safeQuery);

  if (dup) {
    console.log('Memory capture skipped: duplicate detected within 5 minutes.');
    db.close();
    return;
  }

  const ts = Math.floor(Date.now() / 1000);
  const sessionId = process.env.KIMI_SESSION_ID || process.env.CLAUDE_SESSION_ID || `capture-${ts}`;

  // Store as episodic memory (session event)
  db.prepare(
    `INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'memory-capture',
    ts,
    safeQuery,
    safeResponse,
    sessionId,
    JSON.stringify({ type: opts.type, category: opts.category, importance: opts.importance })
  );

  // Also store as semantic memory if it's a fact/pattern/constraint (high value)
  if (['decision', 'pattern', 'constraint'].includes(opts.type) && opts.importance >= 6) {
    db.prepare(
      `INSERT INTO semantic_memory (text, category, importance, created, last_accessed, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      `${safeQuery}. ${safeResponse}`,
      opts.type,
      opts.importance,
      ts, ts,
      'manual-capture'
    );
  }

  db.close();
  console.log(`Memory captured: type=${opts.type}, importance=${opts.importance}`);
}

main();
