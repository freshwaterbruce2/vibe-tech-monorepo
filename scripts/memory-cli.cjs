#!/usr/bin/env node
const Database = require('better-sqlite3');

const DB_PATH = 'D:/databases/memory.db';
const db = new Database(DB_PATH);

function printHelp() {
  console.log(`
VibeTech Memory CLI

USAGE:
  node scripts/memory-cli.cjs stats
  node scripts/memory-cli.cjs search <term> [limit]
  node scripts/memory-cli.cjs semantic <term> [limit]
  node scripts/memory-cli.cjs recent [limit]
  node scripts/memory-cli.cjs add-episodic "<query>" "<response>" [sessionId]
  node scripts/memory-cli.cjs add-semantic "<text>" [category] [importance]

EXAMPLES:
  node scripts/memory-cli.cjs search OAuth 5
  node scripts/memory-cli.cjs add-semantic "Use D:\\ drive for DBs" constraint 9
  node scripts/memory-cli.cjs recent 10
`);
}

function cmdStats() {
  const episodic = db.prepare("SELECT COUNT(*) as c FROM episodic_memory").get().c;
  const semantic = db.prepare("SELECT COUNT(*) as c FROM semantic_memory").get().c;
  const procedural = db.prepare("SELECT COUNT(*) as c FROM procedural_memory").get().c;
  const eArch = db.prepare("SELECT COUNT(*) as c FROM episodic_memory_archive").get().c;
  const sArch = db.prepare("SELECT COUNT(*) as c FROM semantic_memory_archive").get().c;
  console.log('Memory Database Statistics');
  console.log('--------------------------');
  console.log(`Episodic memories:      ${episodic}`);
  console.log(`Semantic memories:      ${semantic}`);
  console.log(`Procedural memories:    ${procedural}`);
  console.log(`Episodic archived:      ${eArch}`);
  console.log(`Semantic archived:      ${sArch}`);
}

function cmdSearch(term, limit = 10) {
  const rows = db.prepare(
    `SELECT datetime(timestamp, 'unixepoch') as dt, substr(query, 1, 100) as q, substr(response, 1, 120) as r
     FROM episodic_memory
     WHERE query LIKE ? OR response LIKE ?
     ORDER BY timestamp DESC
     LIMIT ?`
  ).all(`%${term}%`, `%${term}%`, limit);

  if (rows.length === 0) {
    console.log(`No episodic memories found for '${term}'`);
    return;
  }
  console.log(`Episodic Search Results for: '${term}'`);
  console.log('----------------------------------------');
  for (const row of rows) {
    console.log(`[${row.dt}] ${row.q} | ${row.r}`);
  }
}

function cmdSemanticSearch(term, limit = 10) {
  const rows = db.prepare(
    `SELECT text, category, importance, datetime(created, 'unixepoch') as dt
     FROM semantic_memory
     WHERE text LIKE ? OR category LIKE ?
     ORDER BY importance DESC, created DESC
     LIMIT ?`
  ).all(`%${term}%`, `%${term}%`, limit);

  if (rows.length === 0) {
    console.log(`No semantic memories found for '${term}'`);
    return;
  }
  console.log(`Semantic Search Results for: '${term}'`);
  console.log('------------------------------------------');
  for (const row of rows) {
    console.log(`[${row.dt} | ${row.category} | importance=${row.importance}] ${row.text}`);
  }
}

function cmdRecent(limit = 10) {
  const rows = db.prepare(
    `SELECT datetime(timestamp, 'unixepoch') as dt, session_id, substr(query, 1, 120) as q
     FROM episodic_memory
     ORDER BY timestamp DESC
     LIMIT ?`
  ).all(limit);

  console.log('Recent Episodic Memories');
  console.log('------------------------');
  for (const row of rows) {
    console.log(`[${row.dt}] (${row.session_id}) ${row.q}`);
  }
}

function cmdAddEpisodic(query, response, sessionId) {
  const ts = Math.floor(Date.now() / 1000);
  const sid = sessionId || `kimi-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
  db.prepare(
    `INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run('kimi-cli', ts, query, response, sid);
  console.log('Episodic memory added.');
}

function cmdAddSemantic(text, category = 'general', importance = 5) {
  const ts = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO semantic_memory (text, category, importance, created, last_accessed, embedding_model)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(text, category, importance, ts, ts, 'manual-kimi');
  console.log(`Semantic memory added (category=${category}, importance=${importance}).`);
}

const [,, cmd, ...args] = process.argv;

try {
  switch (cmd) {
    case 'stats': cmdStats(); break;
    case 'search': cmdSearch(args[0], parseInt(args[1]) || 10); break;
    case 'semantic': cmdSemanticSearch(args[0], parseInt(args[1]) || 10); break;
    case 'recent': cmdRecent(parseInt(args[0]) || 10); break;
    case 'add-episodic': cmdAddEpisodic(args[0], args[1], args[2]); break;
    case 'add-semantic': cmdAddSemantic(args[0], args[1], parseInt(args[2]) || 5); break;
    default: printHelp();
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  db.close();
}
