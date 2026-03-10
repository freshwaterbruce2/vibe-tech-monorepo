const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Vibe Learning System Health Check
 * connects to D:\databases\nova_shared.db
 */

const DB_PATH = 'D:\\databases\\nova_shared.db';

function checkHealth() {
  console.log('\x1b[36m%s\x1b[0m', '🧠 Vibe Learning System Health Check');
  console.log('=====================================');

  // 1. Check Database File
  if (!fs.existsSync(DB_PATH)) {
    console.error('\x1b[31m[FAIL]\x1b[0m Database file not found at:', DB_PATH);
    process.exit(1);
  }
  console.log('\x1b[32m[OK]\x1b[0m Database file found');

  try {
    const db = new Database(DB_PATH, { readonly: true });

    // 2. Check Connection
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_executions'")
      .get();
    if (!tableCheck) {
      console.error(
        '\x1b[31m[FAIL]\x1b[0m Table "agent_executions" not found. Schema might be missing.',
      );
      process.exit(1);
    }
    console.log('\x1b[32m[OK]\x1b[0m Connection & Schema verified');

    // 3. Get Stats
    const stats = db
      .prepare(
        `
      SELECT
        (SELECT COUNT(*) FROM agent_executions) as total_executions,
        (SELECT COUNT(*) FROM agent_mistakes) as total_mistakes,
        (SELECT COUNT(*) FROM success_patterns) as patterns
    `,
      )
      .get();

    console.log('\n📊 Statistics:');
    console.log(`- Total Executions: \x1b[33m${stats.total_executions.toLocaleString()}\x1b[0m`);
    console.log(`- Learned Patterns: \x1b[33m${stats.patterns}\x1b[0m`);
    console.log(`- Recorded Mistakes: \x1b[31m${stats.total_mistakes}\x1b[0m`);

    // 4. Recent Activity
    const recent = db
      .prepare(
        `
      SELECT
        agent_name,
        task_type,
        CASE WHEN success = 1 THEN '✅' ELSE '❌' END as status,
        execution_time_seconds,
        executed_at
      FROM agent_executions
      ORDER BY executed_at DESC
      LIMIT 5
    `,
      )
      .all();

    console.log('\n🕒 Recent Activity:');
    recent.forEach((r) => {
      console.log(
        `  ${r.executed_at.substring(11, 19)} ${r.status} [${r.agent_name}] ${r.task_type} (${r.execution_time_seconds?.toFixed(2)}s)`,
      );
    });

    console.log('\n\x1b[32m✅ Learning System is ACTIVE and HEALTHY\x1b[0m');
  } catch (error) {
    console.error('\x1b[31m[ERROR]\x1b[0m Failed to query database:', error.message);
    process.exit(1);
  }
}

checkHealth();
