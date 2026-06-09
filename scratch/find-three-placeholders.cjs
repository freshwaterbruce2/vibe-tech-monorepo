const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const base = path.basename(dir);
  if (base.startsWith('.') || base === 'node_modules' || base === 'dist' || base === 'build' || base === 'out') {
    return files;
  }
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch (err) {
    return files;
  }
  for (const file of list) {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getFiles(filePath, files);
      } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.rs') || file.endsWith('.py')) {
        files.push(filePath);
      }
    } catch (err) {}
  }
  return files;
}

const allFiles = getFiles('C:\\dev');
console.log(`Scanning ${allFiles.length} files...`);

for (const file of allFiles) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch { continue; }

  if (!content.includes('prepare(') && !content.includes('prepare_cached(')) continue;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('prepare') && (line.includes('?') || line.includes(':') || line.includes('@'))) {
      console.log(`--- ${file}:${i+1} ---`);
      for (let j = Math.max(0, i - 1); j < Math.min(lines.length, i + 10); j++) {
        console.log(`${j+1}: ${lines[j]}`);
      }
    }
  }
}
console.log('Done scanning.');
