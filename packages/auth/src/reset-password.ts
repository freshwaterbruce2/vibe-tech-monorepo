import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { hashPassword } from './index.js';
import { getAuthDbPath } from './store.js';

const MIN_PASSWORD_LENGTH = 12;

const parseArgs = (): Record<string, string> => {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        params[key] = val;
        i++;
      } else {
        params[key] = 'true';
      }
    }
  }
  return params;
};

const main = async (): Promise<void> => {
  const params = parseArgs();
  const email = (params['email'] ?? process.env['RESET_EMAIL'])?.trim();
  const password = params['password'] ?? process.env['RESET_PASSWORD'] ?? '';
  const dbParam = params['db']?.trim();
  const updateAll = params['all'] === 'true';

  if (!email) {
    throw new Error('Email is required. Provide it via --email or RESET_EMAIL environment variable.');
  }

  if (!password) {
    throw new Error('Password is required. Provide it via --password or RESET_PASSWORD environment variable.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const { salt, hash } = await hashPassword(password);
  
  // Determine which databases to update
  const dbPaths: string[] = [];
  
  if (dbParam) {
    dbPaths.push(dbParam);
  } else if (updateAll) {
    dbPaths.push(getAuthDbPath());
    dbPaths.push('D:\\databases\\vibe_studio.db');
  } else {
    // Default to central auth.db and vibe_studio.db if no target specified
    dbPaths.push(getAuthDbPath());
    dbPaths.push('D:\\databases\\vibe_studio.db');
  }

  let updatedCount = 0;

  for (const dbPath of dbPaths) {
    if (!existsSync(dbPath)) {
      console.warn(`[reset-password] Warning: Database file does not exist at ${dbPath}. Skipping.`);
      continue;
    }

    const db = new Database(dbPath);
    try {
      // Check if users table exists in the database
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (!tableCheck) {
        console.warn(`[reset-password] Warning: 'users' table not found in ${dbPath}. Skipping.`);
        continue;
      }

      // Check if user exists (case-insensitive search)
      const userCheck = db.prepare('SELECT 1 FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
      if (!userCheck) {
        console.warn(`[reset-password] Warning: User ${email} not found in ${dbPath}.`);
        continue;
      }

      // Update password
      const result = db.prepare(
        'UPDATE users SET password_hash = ?, password_salt = ? WHERE LOWER(email) = ?'
      ).run(hash, salt, email.toLowerCase());

      if (result.changes > 0) {
        console.log(`[reset-password] Successfully updated password for ${email} in ${dbPath}`);
        updatedCount++;
      } else {
        console.warn(`[reset-password] Failed to update user ${email} in ${dbPath}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[reset-password] Error updating database ${dbPath}:`, errMsg);
    } finally {
      db.close();
    }
  }

  if (updatedCount === 0) {
    throw new Error('No user passwords were updated. Verify the email exists in the database(s).');
  }
};

main().catch((error: unknown) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[reset-password] Failed: ${errMsg}\n`);
  process.exitCode = 1;
});
