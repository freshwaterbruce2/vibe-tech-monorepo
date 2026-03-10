import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

console.log("🛠️  Standardizing Monorepo Exports...");

const packages = globSync(['packages/**/package.json', 'apps/**/package.json'], {
  ignore: '**/node_modules/**',
});

packages.forEach((pkgPath) => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (pkg.exports && pkg.exports['.']) {
    const original = pkg.exports['.'];
    
    // Enforce the strict resolution order: types -> import -> require
    pkg.exports['.'] = {
      types: original.types,
      import: original.import,
      require: original.require,
      ...original // Catch any other sub-conditions
    };

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Standardized: ${pkg.name}`);
  }
});

console.log("\n🚀 All package exports are now Node 22 / Vite 7 compliant.");
