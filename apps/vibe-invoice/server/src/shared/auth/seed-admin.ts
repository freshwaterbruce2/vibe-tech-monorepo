/**
 * Seed (or update) the single workspace admin in the central auth store.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL = 'you@example.com'
 *   $env:ADMIN_PASSWORD = '<a strong password>'
 *   npx.cmd tsx packages/auth/src/seed-admin.ts
 *
 * The password is read from the environment only and is never written to source,
 * logs, or stdout. Re-running with a new ADMIN_PASSWORD rotates the admin password
 * in one place for every app pointing at the same AUTH_DB_PATH.
 */

import { openAuthDb, upsertUser, getAuthDbPath } from './store.js';

const MIN_PASSWORD_LENGTH = 12;

const main = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const fullName = process.env.ADMIN_NAME?.trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL is required (set it in the environment before seeding).');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`ADMIN_EMAIL does not look like a valid email: ${email}`);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters (got ${password.length}).`,
    );
  }

  const dbPath = getAuthDbPath();
  const db = openAuthDb(dbPath);
  try {
    const user = await upsertUser(db, { email, password, isAdmin: true, fullName });
    process.stdout.write(
      `[seed-admin] Admin ready: ${user.email} (id=${user.id}, isAdmin=${user.isAdmin}) in ${dbPath}\n`,
    );
  } finally {
    db.close();
  }
};

main().catch((error: unknown) => {
  process.stderr.write(
    `[seed-admin] Failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
