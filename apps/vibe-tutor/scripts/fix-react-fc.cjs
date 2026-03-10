/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (f.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

const targetDir = path.resolve(__dirname, '../src/components');
let totalFixed = 0;

console.log(`Scanning ${targetDir}...`);

walkDir(targetDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Pattern 1: React.FC (no props)
  // const Foo: React.FC = () =>
  content = content.replace(/const\s+(\w+)\s*:\s*React\.FC\s*=\s*\(\)\s*=>/g, 'const $1 = () =>');

  // Pattern 2: React.FC<Props>
  // const Foo: React.FC<Props> = ({ a, b }) =>
  // Capture: 1=Name, 2=PropsType, 3=ArgsBody
  content = content.replace(
    /const\s+(\w+)\s*:\s*React\.FC<(\w+)>\s*=\s*\(([\s\S]*?)\)\s*=>/g,
    (match, name, type, args) => {
      // Check if args contains unbalanced parens which implies failure of regex to stop at correct )
      // But since we use non-greedy matching to the first ) =>, it should be fine unless props destructuring has ) inside strings??
      // Assuming standard code style.

      // Also remove trailing whitespace/newlines from args capture if any
      return `const ${name} = (${args}: ${type}) =>`;
    },
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${path.relative(targetDir, filePath)}`);
    totalFixed++;
  }
});

console.log(`\nCleanup complete! Fixed ${totalFixed} files.`);
