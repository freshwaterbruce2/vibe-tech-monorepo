const fs = require('fs');
const path = require('path');

const file = 'C:\\dev\\packages\\memory\\src\\stores\\EpisodicStore.ts';
const content = fs.readFileSync(file, 'utf8');

// Find all db.prepare or this.db.prepare calls, parse the SQL template/string,
// and trace the variable executing it (all/run/get/etc).
const lines = content.split('\n');
console.log(`Analyzing ${file}`);

// We can search for prepare block, count ? and search for next method call on that stmt.
let currentPrepare = null;
let braceCount = 0;
let collectSql = false;
let sqlLines = [];
let prepareLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('.prepare(`') || line.includes('.prepare(')) {
    prepareLineIndex = i;
    collectSql = true;
    sqlLines = [line];
    if (line.includes(')')) {
      collectSql = false;
      analyzeSql(sqlLines.join('\n'), prepareLineIndex, file);
    }
  } else if (collectSql) {
    sqlLines.push(line);
    if (line.includes(')')) {
      collectSql = false;
      analyzeSql(sqlLines.join('\n'), prepareLineIndex, file);
    }
  }
}

function analyzeSql(sqlCall, lineIndex, filePath) {
  const qMarkCount = (sqlCall.match(/\?/g) || []).length;
  console.log(`\nPrepare call on line ${lineIndex + 1}:`);
  console.log(sqlCall.trim());
  console.log(`Number of '?' placeholders: ${qMarkCount}`);
  
  // Find subsequent execution on stmt or inline prepare execution
  // E.g., const stmt = ...; const rows = stmt.all(...);
  const linesAfter = lines.slice(lineIndex + 1, lineIndex + 30);
  console.log(`Subsequent lines:`);
  for (let k = 0; k < linesAfter.length; k++) {
    const l = linesAfter[k].trim();
    if (l.includes('.all(') || l.includes('.run(') || l.includes('.get(')) {
      console.log(`  -> Execution Line ${lineIndex + 2 + k}: ${l}`);
    }
  }
}
