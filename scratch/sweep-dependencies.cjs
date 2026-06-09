const fs = require('fs');
const path = require('path');

const workspaceRoot = 'V:\\monorepo';

function findPackageJsons(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'out' || file === '.claude' || file === 'release' || file === '_worktrees' || file === '_backups') {
        continue;
      }
      findPackageJsons(filePath, results);
    } else if (file === 'package.json') {
      results.push(filePath);
    }
  }
  return results;
}

const targets = ['vite', '@types/node', 'express'];

function sweepPackageJson(pkgPath) {
  const pkgContent = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgContent);
  const relativePath = path.relative(workspaceRoot, pkgPath);
  let updated = false;
  const changes = [];

  const updateSection = (section) => {
    if (!pkg[section]) return;
    for (const target of targets) {
      if (pkg[section][target] && pkg[section][target] !== 'catalog:') {
        changes.push(`${section}.${target}: "${pkg[section][target]}" -> "catalog:"`);
        pkg[section][target] = 'catalog:';
        updated = true;
      }
    }
  };

  updateSection('dependencies');
  updateSection('devDependencies');

  if (updated) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`Updated [${pkg.name || relativePath}] (${relativePath}):`);
    for (const change of changes) {
      console.log(`  - ${change}`);
    }
    console.log();
  }
  return updated;
}

function main() {
  console.log('Sweeping package.json files for vite, @types/node, and express...');
  const packageFiles = findPackageJsons(workspaceRoot);
  console.log(`Found ${packageFiles.length} package.json files.\n`);

  let updatedCount = 0;
  for (const pkgPath of packageFiles) {
    if (sweepPackageJson(pkgPath)) {
      updatedCount++;
    }
  }

  console.log(`Successfully completed catalog sweep. Updated ${updatedCount} package.json files.`);
}

main();
