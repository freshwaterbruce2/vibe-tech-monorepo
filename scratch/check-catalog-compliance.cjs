const fs = require('fs');
const path = require('path');

const workspaceRoot = 'V:\\monorepo';
const pnpmWorkspacePath = path.join(workspaceRoot, 'pnpm-workspace.yaml');

function getCatalog() {
  const catalog = {};
  try {
    const content = fs.readFileSync(pnpmWorkspacePath, 'utf8');
    const lines = content.split('\n');
    let inCatalog = false;

    for (let line of lines) {
      if (line.match(/^catalog\s*:/)) {
        inCatalog = true;
        continue;
      }

      if (inCatalog && line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('\r')) {
        inCatalog = false;
      }

      if (inCatalog) {
        const match = line.match(/^\s*["']?([^:"'\s]+)["']?\s*:\s*["']?([^"'\r\n]+)["']?/);
        if (match) {
          const name = match[1];
          let version = match[2].trim();
          if (version.startsWith('"') && version.endsWith('"')) version = version.slice(1, -1);
          if (version.startsWith("'") && version.endsWith("'")) version = version.slice(1, -1);
          catalog[name] = version;
        }
      }
    }
    return catalog;
  } catch (e) {
    console.error('Failed to parse pnpm-workspace.yaml:', e);
    return {};
  }
}

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

function checkPackageJson(pkgPath, catalog) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const relativePath = path.relative(workspaceRoot, pkgPath);
  const violations = [];

  const checkDeps = (deps, type) => {
    if (!deps) return;
    for (const [name, version] of Object.entries(deps)) {
      if (catalog[name] && version !== 'catalog:') {
        if (version.startsWith('workspace:')) {
          continue;
        }
        violations.push({
          type,
          name,
          expected: 'catalog:',
          actual: version
        });
      }
    }
  };

  checkDeps(pkg.dependencies, 'dependencies');
  checkDeps(pkg.devDependencies, 'devDependencies');

  return {
    pkgName: pkg.name || relativePath,
    relativePath,
    violations
  };
}

function main() {
  const catalog = getCatalog();
  const catalogSize = Object.keys(catalog).length;
  console.log(`Loaded central catalog with ${catalogSize} dependencies.\n`);

  if (catalogSize === 0) {
    console.error('Error: Could not load any catalog dependencies. Please check regex matching.');
    process.exit(1);
  }

  const packageFiles = findPackageJsons(workspaceRoot);
  console.log(`Found ${packageFiles.length} package.json files in workspace.\n`);

  let totalViolations = 0;
  const results = [];

  for (const pkgPath of packageFiles) {
    const checkResult = checkPackageJson(pkgPath, catalog);
    if (checkResult.violations.length > 0) {
      results.push(checkResult);
      totalViolations += checkResult.violations.length;
    }
  }

  if (totalViolations === 0) {
    console.log('✅ 100% COMPLIANT: All dependencies in all active projects match pnpm catalogs!');
    process.exit(0);
  } else {
    console.log(`❌ VIOLATIONS FOUND: ${totalViolations} dependencies are not using pnpm catalogs:\n`);
    for (const result of results) {
      console.log(`[${result.pkgName}] (${result.relativePath})`);
      for (const v of result.violations) {
        console.log(`  - ${v.name}: "${v.actual}" (should be "${v.expected}")`);
      }
      console.log();
    }
    process.exit(1);
  }
}

main();
