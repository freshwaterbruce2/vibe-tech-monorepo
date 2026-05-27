const fs = require('fs');
const path = require('path');

const summary = process.argv.slice(2).join(' ') || 'No summary provided.';
const logPath = path.join(__dirname, '..', 'memory-bank', 'handoff.log');

const entry = `\n[${new Date().toISOString()}] ${summary}\n`;

fs.appendFileSync(logPath, entry, 'utf-8');
console.log('Handoff recorded:', entry.trim());
