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

function analyzeFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('prepare(')) return;

  let i = 0;
  while (i < content.length) {
    if (content.slice(i, i + 8) === 'prepare(') {
      const startIndex = i;
      i += 8;
      let parenCount = 1;
      let inTemplate = false;
      let inDoubleQuote = false;
      let inSingleQuote = false;
      let sqlText = '';

      while (i < content.length && parenCount > 0) {
        const char = content[i];
        if (inTemplate) {
          if (char === '`' && content[i - 1] !== '\\') {
            inTemplate = false;
          } else {
            sqlText += char;
          }
        } else if (inDoubleQuote) {
          if (char === '"' && content[i - 1] !== '\\') {
            inDoubleQuote = false;
          } else {
            sqlText += char;
          }
        } else if (inSingleQuote) {
          if (char === "'" && content[i - 1] !== '\\') {
            inSingleQuote = false;
          } else {
            sqlText += char;
          }
        } else {
          if (char === '`') inTemplate = true;
          else if (char === '"') inDoubleQuote = true;
          else if (char === "'") inSingleQuote = true;
          else if (char === '(') parenCount++;
          else if (char === ')') parenCount--;
        }
        i++;
      }

      const qMarkCount = (sqlText.match(/\?/g) || []).length;
      const lineNum = content.slice(0, startIndex).split('\n').length;

      let execIndex = -1;
      let execType = '';
      const searchWindow = content.slice(i, i + 2000);
      
      let j = 0;
      while (j < searchWindow.length) {
        if (searchWindow.slice(j, j + 5) === '.all(') {
          execIndex = j;
          execType = 'all';
          break;
        } else if (searchWindow.slice(j, j + 5) === '.run(') {
          execIndex = j;
          execType = 'run';
          break;
        } else if (searchWindow.slice(j, j + 5) === '.get(') {
          execIndex = j;
          execType = 'get';
          break;
        }
        j++;
      }

      if (execIndex !== -1) {
        const startArgs = i + execIndex + 5;
        let execParenCount = 1;
        let execInTemplate = false;
        let execInDoubleQuote = false;
        let execInSingleQuote = false;
        let argsStr = '';
        let argIndex = startArgs;

        while (argIndex < content.length && execParenCount > 0) {
          const char = content[argIndex];
          if (execInTemplate) {
            if (char === '`' && content[argIndex - 1] !== '\\') {
              execInTemplate = false;
            }
          } else if (execInDoubleQuote) {
            if (char === '"' && content[argIndex - 1] !== '\\') {
              execInDoubleQuote = false;
            }
          } else if (execInSingleQuote) {
            if (char === "'" && content[argIndex - 1] !== '\\') {
              execInSingleQuote = false;
            }
          } else {
            if (char === '`') execInTemplate = true;
            else if (char === '"') execInDoubleQuote = true;
            else if (char === "'") execInSingleQuote = true;
            else if (char === '(') execParenCount++;
            else if (char === ')') execParenCount--;
          }
          if (execParenCount > 0) {
            argsStr += char;
          }
          argIndex++;
        }

        let argCount = 0;
        let trimmedArgs = argsStr.trim();
        if (trimmedArgs.endsWith(',')) {
          trimmedArgs = trimmedArgs.slice(0, -1).trim();
        }
        
        if (trimmedArgs) {
          let parenDepth = 0;
          let braceDepth = 0;
          let bracketDepth = 0;
          let count = 1;
          for (let c = 0; c < trimmedArgs.length; c++) {
            const char = trimmedArgs[c];
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
            else if (char === '{') braceDepth++;
            else if (char === '}') braceDepth--;
            else if (char === '[') bracketDepth++;
            else if (char === ']') bracketDepth--;
            else if (char === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
              count++;
            }
          }
          argCount = count;
          if (trimmedArgs.startsWith('...')) {
            argCount = 'spread';
          }
        }

        if (argCount !== 'spread' && argCount !== qMarkCount) {
          console.log(`\n========================================`);
          console.log(`File: ${file}`);
          console.log(`Line ${lineNum}: prepare() call`);
          console.log(`SQL Content:\n${sqlText.trim()}`);
          console.log(`Placeholders count (?): ${qMarkCount}`);
          console.log(`Execution call found: .${execType}(${trimmedArgs})`);
          console.log(`Arguments count: ${argCount}`);
          console.log(`*** MISMATCH DETECTED! ***`);
        }
      }
    } else {
      i++;
    }
  }
}

const dirs = [
  'C:\\dev\\packages\\memory\\src',
  'C:\\dev\\apps\\memory-mcp\\src'
];

for (const dir of dirs) {
  const files = getFiles(dir);
  for (const file of files) {
    analyzeFile(file);
  }
}
