import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Preparing native modules for packaging...');

const nativeModulesDir = path.join(__dirname, '..', 'native-modules');
const nodeModulesDir = path.join(__dirname, '..', '..', '..', 'node_modules');

// Ensure native-modules directory exists
if (!fs.existsSync(nativeModulesDir)) {
  fs.mkdirSync(nativeModulesDir, { recursive: true });
}

const modules = ['better-sqlite3', 'bindings', 'file-uri-to-path'];

modules.forEach(moduleName => {
  const src = path.join(nodeModulesDir, moduleName);
  const dest = path.join(nativeModulesDir, moduleName);

  if (fs.existsSync(src)) {
    console.log(`  Copying ${moduleName}...`);
    try {
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.cpSync(src, dest, { recursive: true });
    } catch (err) {
      console.error(`  Failed to copy ${moduleName}:`, err);
    }
  } else {
    console.warn(`  ⚠️ Module ${moduleName} not found at ${src}`);
  }
});

console.log('✅ Native modules prepared successfully!');
