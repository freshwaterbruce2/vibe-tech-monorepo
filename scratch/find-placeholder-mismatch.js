const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
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

const dirsToSearch = [
  'C:\\dev\\packages\\memory\\src',
  'C:\\dev\\apps\\memory-mcp\\src'
];

for (const dir of dirsToSearch) {
  if (!fs.existsSync(dir)) continue;
  const files = getFiles(dir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find all prepare/all occurrences or general SQLite code
    if (content.includes('prepare') && (content.includes('.all') || content.includes('.run') || content.includes('.get'))) {
      console.log(`Analyzing file: ${file}`);
      // Let's print out lines containing prepare and matching `.all` or execution
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('prepare') || line.includes('.all(') || line.includes('.run(')) {
          console.log(`  Line ${i+1}: ${line.trim()}`);
        }
      }
    }
  }
}
