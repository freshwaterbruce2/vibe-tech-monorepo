import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { minimatch } from 'minimatch';

const CONFIG_PATHS = [
  '.github/self-healing-config.yml'
];

// Read config
function loadConfig() {
  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      try {
        const file = fs.readFileSync(configPath, 'utf8');
        return YAML.parse(file);
      } catch (e) {
        console.error(`Failed to load safety config from ${configPath}:`, e.message);
      }
    }
  }
  console.error('No safety config found in .github');
  process.exit(1);
}

// Check if a file is safe to auto-fix
function isFileSafe(filePath, config) {
  const blockedPatterns = config.safety.blocked_paths || [];
  
  // Check against blocked patterns
  for (const pattern of blockedPatterns) {
    if (minimatch(filePath, pattern, { dot: true })) {
      console.error(`❌ BLOCKED: ${filePath} matches blocked pattern: ${pattern}`);
      return false;
    }
  }
  
  return true;
}

// Main execution
async function main() {
  const config = loadConfig();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-auto-fix-safety.mjs <file_list_path> or <file_path>');
    process.exit(1);
  }

  let filesToCheck = [];

  // Check if argument is a file containing a list of files (from CI)
  if (fs.existsSync(args[0]) && fs.statSync(args[0]).isFile() && !args[0].endsWith('.ts') && !args[0].endsWith('.js') && !args[0].endsWith('.tsx')) {
     try {
       const content = fs.readFileSync(args[0], 'utf-8');
       filesToCheck = content.split('\n').filter(line => line.trim() !== '');
     } catch (e) {
       // treat as single file path if read fails or logic dictates
       filesToCheck = [args[0]];
     }
  } else {
    // Treat arguments as direct file paths
    filesToCheck = args;
  }

  console.log(`🔍 Validating ${filesToCheck.length} files against safety rules...`);
  
  let hasUnsafeFiles = false;
  
  for (const file of filesToCheck) {
    if (!isFileSafe(file, config)) {
      hasUnsafeFiles = true;
    } else {
        // Optional: Verbose mode could show safe files
        // console.log(`✅ SAFE: ${file}`);
    }
  }

  if (hasUnsafeFiles) {
    console.error('🚨 SAFETY CHECK FAILED: Validation script found blocked files.');
    process.exit(1);
  } else {
    console.log('✅ SAFETY CHECK PASSED: All files are safe for auto-fix.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
