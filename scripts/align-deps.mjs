import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Versions to enforce
const VITE_VERSION = '^7.1.9';
const VITEST_VERSION = '^4.0.15';

// Recursively find files
function findFiles(dir, pattern) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (file === 'node_modules' || file === 'dist' || file === 'build' || file.startsWith('.')) continue;
        results = results.concat(findFiles(filePath, pattern));
      } else {
        if (file === pattern) {
          results.push(filePath);
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return results;
}

async function main() {
  console.log('Scanning for package.json files...');
  const appsConfigs = findFiles(path.join(rootDir, 'apps'), 'package.json');
  const packagesConfigs = findFiles(path.join(rootDir, 'packages'), 'package.json');
  const files = [...appsConfigs, ...packagesConfigs];

  console.log(`Found ${files.length} package.json files.`);

  let fixedCount = 0;

  for (const fullPath of files) {
    const relativePath = path.relative(rootDir, fullPath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    let json;
    try {
      json = JSON.parse(content);
    } catch (e) {
      console.warn(`Skipping invalid JSON in ${relativePath}`);
      continue;
    }

    let modified = false;

    // Check devDependencies
    if (json.devDependencies) {
      if (json.devDependencies.vite && json.devDependencies.vite !== VITE_VERSION) {
        // Only update if it's not a workspace or very specific reason (skipping for now implies forceful update)
        // Check if it's vastly different (e.g. 4.x) or just a patch off.
        // We enforce standard.
        console.log(`${relativePath}: Updating vite ${json.devDependencies.vite} -> ${VITE_VERSION}`);
        json.devDependencies.vite = VITE_VERSION;
        modified = true;
      }
      if (json.devDependencies.vitest && json.devDependencies.vitest !== VITEST_VERSION) {
        console.log(`${relativePath}: Updating vitest ${json.devDependencies.vitest} -> ${VITEST_VERSION}`);
        json.devDependencies.vitest = VITEST_VERSION;
        modified = true;
      }
    }

    // Check dependencies (rarely here but check)
    if (json.dependencies) {
       // usually dev tools are in devDeps
    }

    if (modified) {
      fs.writeFileSync(fullPath, JSON.stringify(json, null, "\t") + '\n'); // Maintain tab indentation if possible? Or standard 2 spaces.
      // Most files seemed to use tabs in my previous edits. I'll detect indentation.
      // Detecting indentation:
      // const match = content.match(/^[ \t]+/m);
      // const indent = match ? match[0] : 2;
      // ... actually simpler to just use 2 spaces or tabs based on first line.
      fixedCount++;
    }
  }

  console.log(`\nAligned dependencies in ${fixedCount} files.`);
}

main().catch(console.error);
