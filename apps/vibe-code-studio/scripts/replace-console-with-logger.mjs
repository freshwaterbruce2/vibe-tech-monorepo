#!/usr/bin/env node
/**
 * Replace console.log/warn/error/info/debug with logger calls
 * Automatically adds logger import if missing
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CONSOLE_PATTERN = /console\.(log|warn|error|info|debug)\(/g;

// Check if path should be excluded
const shouldExclude = (filePath) => {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return (
    relativePath.includes('__tests__') ||
    relativePath.includes('.test.') ||
    relativePath.includes('.spec.') ||
    relativePath.includes('test-') ||
    relativePath.includes('\\examples\\') ||
    relativePath.includes('/examples/') ||
    relativePath.endsWith('setup.ts')
  );
};

// Recursively find all .ts and .tsx files
const findFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'out' && file !== '.git') {
        findFiles(filePath, fileList);
      }
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !shouldExclude(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
};

// Logger import paths
const getLoggerImport = (filePath) => {
  const relativePath = path.relative(PROJECT_ROOT, filePath);

  if (relativePath.startsWith('electron\\') || relativePath.startsWith('electron/')) {
    // Count how many directories deep we are in electron/
    const depth = relativePath.split(path.sep).length - 2; // -1 for 'electron', -1 for filename
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    return `import { logger } from '${prefix}logger';`;
  }

  // For src/ files, calculate relative path to Logger service
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(PROJECT_ROOT, 'src', 'services', 'Logger.ts');
  const relativeToLogger = path.relative(fileDir, loggerPath);
  const importPath = relativeToLogger.replace(/\\/g, '/').replace('.ts', '');

  return `import { logger } from '${importPath}';`;
};

// Check if file already imports logger
const hasLoggerImport = (content) => {
  return /import\s+.*\blogger\b.*from\s+['"].*[Ll]ogger['"]/.test(content);
};

// Add logger import to file
const addLoggerImport = (content, filePath) => {
  const loggerImport = getLoggerImport(filePath);

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') && !line.includes('type {')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    // Add logger import after last import
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    // Add logger import at the beginning
    let insertIndex = 0;
    // Skip over comments at the top
    while (insertIndex < lines.length && (
      lines[insertIndex].trim().startsWith('/**') ||
      lines[insertIndex].trim().startsWith('*') ||
      lines[insertIndex].trim().startsWith('//') ||
      lines[insertIndex].trim() === ''
    )) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, loggerImport, '');
  }

  return lines.join('\n');
};

// Replace console calls with logger calls
const replaceConsoleCalls = (content) => {
  return content.replace(CONSOLE_PATTERN, (match, method) => {
    // console.log -> logger.info (for general logging)
    // console.debug -> logger.debug
    // console.warn -> logger.warn
    // console.error -> logger.error
    // console.info -> logger.info

    const mapping = {
      'log': 'info',
      'debug': 'debug',
      'warn': 'warn',
      'error': 'error',
      'info': 'info'
    };

    return `logger.${mapping[method]}(`;
  });
};

// Process a single file
const processFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Skip if no console statements
    if (!CONSOLE_PATTERN.test(content)) {
      return { changed: false };
    }

    let newContent = content;

    // Add logger import if not present
    if (!hasLoggerImport(content)) {
      newContent = addLoggerImport(newContent, filePath);
    }

    // Replace console calls
    newContent = replaceConsoleCalls(newContent);

    // Write back if changed
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return { changed: true, file: filePath };
    }

    return { changed: false };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, error: error.message };
  }
};

// Main execution
function main() {
  console.log('🔍 Finding files with console statements...\n');

  // Find all TypeScript files in src/ and electron/
  const srcFiles = findFiles(path.join(PROJECT_ROOT, 'src'));
  const electronFiles = findFiles(path.join(PROJECT_ROOT, 'electron'));
  const files = [...srcFiles, ...electronFiles];

  console.log(`📁 Found ${files.length} files to check\n`);

  const results = {
    changed: [],
    unchanged: [],
    errors: []
  };

  for (const file of files) {
    const result = processFile(file);

    if (result.error) {
      results.errors.push(result);
    } else if (result.changed) {
      results.changed.push(file);
      console.log(`✅ Updated: ${path.relative(PROJECT_ROOT, file)}`);
    } else {
      results.unchanged.push(file);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Changed: ${results.changed.length} files`);
  console.log(`  ⏭️  Unchanged: ${results.unchanged.length} files`);
  console.log(`  ❌ Errors: ${results.errors.length} files`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  console.log('\n✨ Console replacement complete!');
}

main();
