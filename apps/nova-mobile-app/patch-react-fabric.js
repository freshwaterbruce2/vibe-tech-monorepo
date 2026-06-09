const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (file !== '.bin' && file !== '.cache' && file !== 'src') {
          results = results.concat(walk(fullPath));
        }
      } else if (file === 'ReactFabric.js') {
        results.push(fullPath);
      }
    });
  } catch (e) {
    // Ignore errors for unreadable dirs
  }
  return results;
}

const nodeModules = path.resolve(__dirname, '../../node_modules');
console.log('Searching for ReactFabric.js in:', nodeModules);
const files = walk(nodeModules);
console.log(`Found ${files.length} ReactFabric.js files.`);

let patchedCount = 0;
files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('global.RN$stopSurface = ReactFabric.stopSurface;') && !content.includes('try {')) {
      const patched = content.replace(
        'global.RN$stopSurface = ReactFabric.stopSurface;',
        `try {
  global.RN$stopSurface = ReactFabric.stopSurface;
} catch (e) {
  console.log('ANTIGRAVITY: Bypassed read-only RN$stopSurface assignment:', e.message);
}`
      );
      fs.writeFileSync(file, patched, 'utf8');
      console.log('Successfully patched:', file);
      patchedCount++;
    } else {
      console.log('Already patched or not matching:', file);
    }
  } catch (err) {
    console.error(`Failed to patch ${file}:`, err.message);
  }
});
console.log(`Successfully patched ${patchedCount} files.`);
