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
        // Exclude huge pnpm virtual store and other irrelevant dirs
        if (file !== '.bin' && file !== '.cache' && file !== '.pnpm') {
          results = results.concat(walk(fullPath));
        }
      } else if (file === 'setUpFuseboxReactDevToolsDispatcher.js') {
        results.push(fullPath);
      }
    });
  } catch (e) {
    // Ignore errors for unreadable dirs
  }
  return results;
}

const nodeModules = path.resolve(__dirname, '../../node_modules');
console.log('Searching for setUpFuseboxReactDevToolsDispatcher.js in:', nodeModules);
const files = walk(nodeModules);
console.log(`Found ${files.length} setUpFuseboxReactDevToolsDispatcher.js files.`);

let patchedCount = 0;
files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes("Object.defineProperty(global, '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__'") && 
        !content.includes('Bypassed read-only __FUSEBOX_REACT_DEVTOOLS_DISPATCHER__')) {
      
      const targetStr = `Object.defineProperty(global, '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__', {
  value: FuseboxReactDevToolsDispatcher,
  configurable: false,
  enumerable: false,
  writable: false,
});`;
      
      // Support potential variations in line endings or spaces
      const targetRegex = /Object\.defineProperty\(\s*global,\s*['"]__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__['"],\s*\{\s*value:\s*FuseboxReactDevToolsDispatcher,\s*configurable:\s*false,\s*enumerable:\s*false,\s*writable:\s*false,?\s*\}\s*\);/g;

      let patched = content;
      if (content.includes("configurable: false")) {
        patched = content.replace(
          targetRegex,
          `try {
  Object.defineProperty(global, '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__', {
    value: FuseboxReactDevToolsDispatcher,
    configurable: true,
    enumerable: false,
    writable: false,
  });
} catch (e) {
  console.log('ANTIGRAVITY: Bypassed read-only __FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ defineProperty:', e.message);
}`
        );
      }

      if (patched !== content) {
        fs.writeFileSync(file, patched, 'utf8');
        console.log('Successfully patched:', file);
        patchedCount++;
      } else {
        console.log('Regex did not match exactly, fallback to string replacement:', file);
        const fallbackTarget = `Object.defineProperty(global, '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__', {
  value: FuseboxReactDevToolsDispatcher,
  configurable: false,
  enumerable: false,
  writable: false,
});`;
        if (content.includes(fallbackTarget)) {
          const fallbackPatched = content.replace(
            fallbackTarget,
            `try {
  Object.defineProperty(global, '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__', {
    value: FuseboxReactDevToolsDispatcher,
    configurable: true,
    enumerable: false,
    writable: false,
  });
} catch (e) {
  console.log('ANTIGRAVITY: Bypassed read-only __FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ defineProperty:', e.message);
}`
          );
          fs.writeFileSync(file, fallbackPatched, 'utf8');
          console.log('Successfully patched via fallback:', file);
          patchedCount++;
        } else {
          console.log('Not patched (pattern mismatch):', file);
        }
      }
    } else {
      console.log('Already patched or not matching:', file);
    }
  } catch (err) {
    console.error(`Failed to patch ${file}:`, err.message);
  }
});
console.log(`Successfully patched ${patchedCount} files.`);
