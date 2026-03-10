import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TSCONFIG_BASE_PATH = 'tsconfig.base.json';

// Recursively find files
function findFiles(dir, pattern) {
  let results = [];
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
  return results;
}

async function main() {
  console.log('Scanning for tsconfig.json files...');
  // Only scan apps and packages
  const appsConfigs = findFiles(path.join(rootDir, 'apps'), 'tsconfig.json');
  const packagesConfigs = findFiles(path.join(rootDir, 'packages'), 'tsconfig.json');
  const files = [...appsConfigs, ...packagesConfigs];

  console.log(`Found ${files.length} tsconfig.json files.`);

  let fixedCount = 0;

  for (const fullPath of files) {
    const relativePath = path.relative(rootDir, fullPath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Skip if empty
    if (!content.trim()) continue;

    let json;
    try {
      // Basic comment stripping
      const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      json = JSON.parse(cleanContent);
    } catch (e) {
      console.warn(`Skipping invalid JSON in ${relativePath}`);
      continue;
    }

    // Determine correct relative path to base
    // depth: apps/my-app/tsconfig.json -> depth 2 -> ../../
    // apps/group/my-app/tsconfig.json -> depth 3 -> ../../../
    const depth = relativePath.split(path.sep).length - 1;
    let relativeBase = '../'.repeat(depth) + TSCONFIG_BASE_PATH;
    
    // Normalize slashes for Windows
    relativeBase = relativeBase.replace(/\\/g, '/');

    const originalExtends = json.extends;
    
    // If it already extends the correct base, skip (unless we want to force format)
    if (originalExtends === relativeBase) {
       continue;
    }

    // Update extends
    json.extends = relativeBase;

    // Optional: Clean up common duplicates if safe
    if (json.compilerOptions) {
        // delete json.compilerOptions.strict; // Base is strict, let's inherit
        // delete json.compilerOptions.target; // Keep target if it was specific
        // delete json.compilerOptions.module;
        // delete json.compilerOptions.esModuleInterop;
        // delete json.compilerOptions.skipLibCheck;
        // delete json.compilerOptions.forceConsistentCasingInFileNames;
    }

    fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n');
    console.log(`Fixed: ${relativePath} (was extending: ${originalExtends || 'none'})`);
    fixedCount++;
  }

  console.log(`\nStandardized ${fixedCount} files.`);
}

main().catch(console.error);