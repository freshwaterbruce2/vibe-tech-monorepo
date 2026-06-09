const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\fresh_zxae3v6\\.gemini\\antigravity-cli\\brain\\23cb33a3-319b-4675-aef1-375ee03802ef\\.system_generated\\tasks\\task-1738.log';
if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist');
  process.exit(0);
}

const content = fs.readFileSync(logPath, 'utf8');
const blocks = content.split('========================================');
console.log(`Found ${blocks.length} mismatch blocks in log.`);

for (const block of blocks) {
  if (block.toLowerCase().includes('memory') || block.toLowerCase().includes('unified')) {
    console.log('--- Matching Block ---');
    console.log(block.trim());
  }
}
