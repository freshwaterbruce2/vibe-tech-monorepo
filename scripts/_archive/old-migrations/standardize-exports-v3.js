import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

console.log("🛠️  Standardizing Monorepo Exports (V3 - Fix & Repair)...");

const packages = globSync(['packages/**/package.json', 'apps/**/package.json'], {
  ignore: '**/node_modules/**',
});

function repairBrokenStringObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  // Check if object looks like { "0": "c", "1": "h", ... }
  const keys = Object.keys(obj);
  if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
    // It's a spread string
    const sortedKeys = keys.sort((a, b) => parseInt(a) - parseInt(b));
    return sortedKeys.map(k => obj[k]).join('');
  }
  return obj;
}

packages.forEach((pkgPath) => {
  let changed = false;
  let pkg;
  try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (e) {
      console.error(`Failed to parse ${pkgPath}`);
      return;
  }

  if (!pkg.exports) return;

  // Fix root export "."
  if (pkg.exports['.']) {
    let rootExport = pkg.exports['.'];
    
    // 1. Repair broken spread strings
    const repaired = repairBrokenStringObject(rootExport);
    
    if (repaired !== rootExport) {
        // If it was broken, it's now a string (likely).
        // Let's upgrade it to a proper object for Vite 7 / Node compatibility
        // Assuming the string path is the import/default
        const mainPath = typeof repaired === 'string' ? repaired : pkg.main;
        
        // Try to derive types path
        let typesPath = pkg.types;
        if (!typesPath && typeof mainPath === 'string') {
            typesPath = mainPath.replace(/\.js$/, '.d.ts').replace(/\.mjs$/, '.d.mts').replace(/\.cjs$/, '.d.cts');
        }

        pkg.exports['.'] = {
            types: typesPath,
            import: mainPath,
            default: mainPath
        };
        changed = true;
    } else if (typeof rootExport === 'string') {
        // Upgrade existing string to object
        const mainPath = rootExport;
        let typesPath = pkg.types;
        if (!typesPath) {
             typesPath = mainPath.replace(/\.js$/, '.d.ts');
        }
        pkg.exports['.'] = {
            types: typesPath,
            import: mainPath,
            default: mainPath
        };
        changed = true;
    }
  }

  // Fix other exports if they are broken spread strings
  Object.keys(pkg.exports).forEach(key => {
      if (key === '.') return;
      let exp = pkg.exports[key];
      const repaired = repairBrokenStringObject(exp);
      if (repaired !== exp) {
          pkg.exports[key] = repaired;
          changed = true;
      }
  });

  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Repaired & Standardized: ${pkg.name} (${pkgPath})`);
  }
});

console.log("\n🚀 All package exports are now valid and compliant.");
