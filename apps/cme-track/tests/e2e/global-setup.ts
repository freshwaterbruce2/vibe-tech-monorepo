import { openAuthDb, upsertUser } from '@vibetech/auth';

/**
 * Seed the central workspace auth store before the E2E run.
 *
 * Login authenticates against the central store (D:\databases\auth.db in production),
 * so the operator the smoke test signs in as must exist there first. We point
 * AUTH_DB_PATH at a throwaway test DB (see playwright.config.ts) and upsert the
 * operator into it, keeping the suite hermetic and isolated from the real admin.
 */
export default async function globalSetup(): Promise<void> {
  const dbPath = process.env.AUTH_DB_PATH;
  const email = process.env.E2E_OPERATOR_EMAIL;
  const password = process.env.E2E_OPERATOR_PASSWORD;
  const fullName = process.env.E2E_OPERATOR_NAME ?? 'CME Track Owner';

  if (!dbPath || !email || !password) {
    throw new Error(
      'E2E auth seeding requires AUTH_DB_PATH, E2E_OPERATOR_EMAIL, and E2E_OPERATOR_PASSWORD (set in playwright.config.ts).',
    );
  }

  const db = openAuthDb(dbPath);
  try {
    await upsertUser(db, { email, password, isAdmin: true, fullName });
  } finally {
    db.close();
  }
}
