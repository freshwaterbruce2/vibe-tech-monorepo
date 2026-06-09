import * as fs from 'fs';
import * as path from 'path';

const MASTER_SECRETS_PATH = 'D:\\data\\master-secrets.env';
const APPS_DIR = 'V:\\monorepo\\apps';

interface Secrets {
  [key: string]: string;
}

// Read and parse master secrets from the vault on D: drive
function readMasterSecrets(): Secrets {
  if (!fs.existsSync(MASTER_SECRETS_PATH)) {
    throw new Error(`Master secrets file not found at ${MASTER_SECRETS_PATH}`);
  }
  
  const content = fs.readFileSync(MASTER_SECRETS_PATH, 'utf-8');
  const secrets: Secrets = {};
  
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      secrets[key] = val;
    }
  }
  return secrets;
}

// Check if a value is empty or matches a placeholder pattern
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const val = value.toLowerCase();
  return (
    val === 'placeholder' ||
    val.includes('your_') ||
    val.includes('todo') ||
    val.includes('change-me') ||
    val.includes('sk_test_placeholder') ||
    val.includes('pk_test_placeholder')
  );
}

// Safely update or append variables in env file lines
function updateEnvLines(lines: string[], secrets: Secrets, updatedKeys: Set<string>): string[] {
  const result: string[] = [];
  const parsedKeys = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      parsedKeys.add(key);

      // Overwrite placeholders with the master value
      if (secrets[key] !== undefined && isPlaceholder(val)) {
        result.push(`${key}=${secrets[key]}`);
        updatedKeys.add(key);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  // Append any missing keys that were not present in the env file at all
  for (const key of Object.keys(secrets)) {
    if (!parsedKeys.has(key)) {
      result.push(`${key}=${secrets[key]}`);
      updatedKeys.add(key);
    }
  }

  return result;
}

// Process a single application directory
function processApp(appDir: string, secrets: Secrets): boolean {
  const appPath = path.join(APPS_DIR, appDir);
  if (!fs.statSync(appPath).isDirectory()) return false;

  // Find env.example files
  const files = fs.readdirSync(appPath);
  const exampleFiles = files.filter(f => f.startsWith('.env.example'));
  if (exampleFiles.length === 0) return false;

  const envPath = path.join(appPath, '.env');
  let createdFromExample = false;

  // If .env doesn't exist, create it from example
  if (!fs.existsSync(envPath)) {
    const examplePath = path.join(appPath, exampleFiles[0]);
    fs.copyFileSync(examplePath, envPath);
    createdFromExample = true;
  }

  const envLocalPath = path.join(appPath, '.env.local');
  let modified = false;

  // Process .env file
  const envLines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  const updatedKeys = new Set<string>();
  const newEnvLines = updateEnvLines(envLines, secrets, updatedKeys);

  if (updatedKeys.size > 0 || createdFromExample) {
    fs.writeFileSync(envPath, newEnvLines.join('\n') + '\n', 'utf-8');
    modified = true;
  }

  // Process .env.local file if it exists
  if (fs.existsSync(envLocalPath)) {
    const localLines = fs.readFileSync(envLocalPath, 'utf-8').split(/\r?\n/);
    const updatedLocalKeys = new Set<string>();
    const newLocalLines = updateEnvLines(localLines, secrets, updatedLocalKeys);

    if (updatedLocalKeys.size > 0) {
      fs.writeFileSync(envLocalPath, newLocalLines.join('\n') + '\n', 'utf-8');
      modified = true;
    }
  }

  if (modified) {
    const action = createdFromExample ? 'Created .env and populated' : 'Updated';
    console.log(`[OK] ${appDir}: ${action} credentials.`);
  }

  return modified;
}

// Main execution function
function main() {
  console.log('Starting credentials distribution to apps...');
  try {
    const secrets = readMasterSecrets();
    const apps = fs.readdirSync(APPS_DIR);
    let updatedCount = 0;

    for (const app of apps) {
      if (processApp(app, secrets)) {
        updatedCount++;
      }
    }
    console.log(`\nSuccess! Distributed credentials to ${updatedCount} apps.`);
  } catch (error) {
    console.error('Failed to distribute credentials:', error);
    process.exit(1);
  }
}

main();
