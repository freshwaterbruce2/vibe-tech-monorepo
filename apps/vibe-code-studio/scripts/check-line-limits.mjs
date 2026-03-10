#!/usr/bin/env node
/**
 * Line Limit Checker - 500 lines +/- 100 Standard Enforcement
 *
 * Validates that source files adhere to the 500 lines +/- 100 standard:
 * - Target: 500 lines +/- 100
 * - Tolerance: 400-600 lines (warning zone)
 * - Hard limit: 600 lines (blocks commit)
 *
 * Usage:
 *   node scripts/check-line-limits.mjs               # Check all files
 *   node scripts/check-line-limits.mjs --staged      # Check only staged files
 *   node scripts/check-line-limits.mjs --max 500     # Custom limit
 *   node scripts/check-line-limits.mjs --fix         # Suggest refactorings
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const DEFAULT_LINE_LIMIT = 500;
const TOLERANCE_LIMIT = 600;
const WARNING_THRESHOLD = 400;

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs'];
const EXCLUDED_PATTERNS = ['node_modules', 'dist', 'build', '.next', 'coverage', '__tests__', '.test.', '.spec.'];

// Parse command line arguments
const args = process.argv.slice(2);
const checkStaged = args.includes('--staged');
const customLimit = args.find(arg => arg.startsWith('--max'));
const maxLines = customLimit
  ? parseInt(customLimit.includes('=') ? customLimit.split('=')[1] : args[args.indexOf(customLimit) + 1])
  : DEFAULT_LINE_LIMIT;
const suggestFixes = args.includes('--fix');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Get list of files to check
 */
function getFilesToCheck() {
  if (checkStaged) {
    // Get staged files from git
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
        cwd: projectRoot,
        encoding: 'utf-8'
      });
      return output
        .trim()
        .split('\n')
        .filter(file => file.length > 0)
        .map(file => path.resolve(projectRoot, file))
        .filter(file => isCodeFile(file));
    } catch (error) {
      console.error('Failed to get staged files:', error.message);
      return [];
    }
  } else {
    // Recursively get all code files
    const files = [];
    function walkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded directories/files
        if (EXCLUDED_PATTERNS.some(pattern => fullPath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && isCodeFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }

    walkDir(path.join(projectRoot, 'src'));
    walkDir(path.join(projectRoot, 'electron'));
    return files;
  }
}

/**
 * Check if file is a code file
 */
function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Count lines in a file
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    console.warn(`Failed to read ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Analyze file and suggest refactorings
 */
function suggestRefactoring(filePath, lineCount) {
  const suggestions = [];
  const content = fs.readFileSync(filePath, 'utf-8');

  // Detect large functions
  const functionPattern = /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w]+)\s*=>)[^{]*\{/g;
  const functions = [];
  let match;

  while ((match = functionPattern.exec(content)) !== null) {
    const startLine = content.substring(0, match.index).split('\n').length;
    // Find matching closing brace (simplified - may not be perfect)
    let braceCount = 1;
    let pos = match.index + match[0].length;
    while (braceCount > 0 && pos < content.length) {
      if (content[pos] === '{') braceCount++;
      if (content[pos] === '}') braceCount--;
      pos++;
    }
    const endLine = content.substring(0, pos).split('\n').length;
    const functionLines = endLine - startLine;

    if (functionLines > 50) {
      functions.push({ name: match[0].substring(0, 40), startLine, lines: functionLines });
    }
  }

  if (functions.length > 0) {
    suggestions.push('  Large functions detected:');
    functions.forEach(fn => {
      suggestions.push(`    - Line ${fn.startLine}: ${fn.name}... (${fn.lines} lines)`);
    });
    suggestions.push('  → Consider splitting into smaller functions (<50 lines each)');
  }

  // Detect duplicate logic
  const lines = content.split('\n');
  const codeLines = lines.filter(l => {
    const trimmed = l.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  });

  if (codeLines.length > maxLines) {
    const excessLines = lineCount - maxLines;
    suggestions.push(`\n  File exceeds limit by ${excessLines} lines`);
    suggestions.push('  Refactoring strategies:');
    suggestions.push('    1. Extract utility functions into separate files');
    suggestions.push('    2. Split into feature-specific modules');
    suggestions.push('    3. Move types/interfaces to separate .types.ts file');
    suggestions.push('    4. Extract large constants to separate config file');
  }

  return suggestions;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}Checking Line Limits (target: ${maxLines} lines)${colors.reset}\n`);

  const files = getFilesToCheck();

  if (files.length === 0) {
    console.log(`${colors.gray}No files to check${colors.reset}`);
    return 0;
  }

  const violations = {
    errors: [],    // > TOLERANCE_LIMIT (400)
    warnings: [],  // > maxLines (360)
    info: []       // > WARNING_THRESHOLD (340)
  };

  let totalLines = 0;
  let totalFiles = 0;

  for (const filePath of files) {
    const lineCount = countLines(filePath);
    if (lineCount === 0) continue;

    totalLines += lineCount;
    totalFiles++;

    const relativePath = path.relative(projectRoot, filePath);

    if (lineCount > TOLERANCE_LIMIT) {
      violations.errors.push({ path: relativePath, lines: lineCount });
    } else if (lineCount > maxLines) {
      violations.warnings.push({ path: relativePath, lines: lineCount });
    } else if (lineCount > WARNING_THRESHOLD) {
      violations.info.push({ path: relativePath, lines: lineCount });
    }
  }

  // Display results
  const avgLines = Math.round(totalLines / totalFiles);
  console.log(`${colors.gray}Analyzed ${totalFiles} files (avg: ${avgLines} lines)${colors.reset}\n`);

  // Errors (hard limit exceeded)
  if (violations.errors.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ ERRORS (exceeds hard limit of ${TOLERANCE_LIMIT} lines):${colors.reset}`);
    violations.errors.forEach(({ path, lines }) => {
      console.log(`${colors.red}  ${path} - ${lines} lines (+${lines - TOLERANCE_LIMIT})${colors.reset}`);
      if (suggestFixes) {
        const suggestions = suggestRefactoring(path, lines);
        suggestions.forEach(s => console.log(`${colors.gray}${s}${colors.reset}`));
      }
    });
    console.log();
  }

  // Warnings (exceeds recommended limit)
  if (violations.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  WARNINGS (exceeds ${maxLines} lines):${colors.reset}`);
    violations.warnings.forEach(({ path, lines }) => {
      console.log(`${colors.yellow}  ${path} - ${lines} lines (+${lines - maxLines})${colors.reset}`);
      if (suggestFixes) {
        const suggestions = suggestRefactoring(path, lines);
        suggestions.forEach(s => console.log(`${colors.gray}${s}${colors.reset}`));
      }
    });
    console.log();
  }

  // Info (approaching limit)
  if (violations.info.length > 0) {
    console.log(`${colors.blue}ℹ️  INFO (approaching ${maxLines} lines):${colors.reset}`);
    violations.info.forEach(({ path, lines }) => {
      console.log(`${colors.blue}  ${path} - ${lines} lines (${maxLines - lines} remaining)${colors.reset}`);
    });
    console.log();
  }

  // Summary
  const totalViolations = violations.errors.length + violations.warnings.length;

  if (totalViolations === 0) {
    console.log(`${colors.green}✓ All files comply with ${maxLines}-line standard${colors.reset}`);
    return 0;
  }

  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  Errors: ${colors.red}${violations.errors.length}${colors.reset} (>${TOLERANCE_LIMIT} lines)`);
  console.log(`  Warnings: ${colors.yellow}${violations.warnings.length}${colors.reset} (>${maxLines} lines)`);
  console.log(`  Info: ${colors.blue}${violations.info.length}${colors.reset} (>${WARNING_THRESHOLD} lines)`);
  console.log();

  if (violations.errors.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Commit blocked: ${violations.errors.length} file(s) exceed hard limit${colors.reset}`);
    console.log(`${colors.gray}Run with --fix to see refactoring suggestions:${colors.reset}`);
    console.log(`${colors.gray}  node scripts/check-line-limits.mjs --staged --fix${colors.reset}`);
    return 1; // Exit with error code
  }

  if (violations.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  Warning: ${violations.warnings.length} file(s) exceed recommended limit${colors.reset}`);
    console.log(`${colors.gray}Consider refactoring before adding more code${colors.reset}`);
    // Allow commit but warn
    return 0;
  }

  return 0;
}

// Run the script
const exitCode = main();
process.exit(exitCode);
