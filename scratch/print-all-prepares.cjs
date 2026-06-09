const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, files);
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs')) {
      files.push(filePath);
    }
  }
  return files;
}

const dirs = [
  'C:\\dev\\packages\\memory\\src',
  'C:\\dev\\apps\\memory-mcp\\src'
];

for (const dir of dirs) {
  const files = getFiles(dir);
  for (const file of files) {
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('prepare(')) continue;
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('prepare(') || line.includes('.prepare(`')) {
        console.log(`\n--- ${file}:${i+1} ---`);
        for (let j = i; j < Math.min(lines.length, i + 12); j++) {
          console.log(`${j+1}: ${lines[j]}`);
        }
      }
    }
  }
}
