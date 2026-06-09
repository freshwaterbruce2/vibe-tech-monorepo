/**
 * Central workspace user store.
 *
 * Single source of truth for workspace logins: one SQLite database on D:\ holding
 * the admin (and any future users), with scrypt-hashed passwords. Apps authenticate
 * against this store and then mint the shared session token (see index.ts), so one
 * admin email + password works across every app that points at the same AUTH_DB_PATH
 * and AUTH_SECRET.
 *
 * Per workspace paths policy: databases live on D:\, never in C:\dev. The path is
 * env-driven (AUTH_DB_PATH) and never hardcoded into app source.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { hashPassword, verifyPassword, type AuthUser } from './index.js';

const DEFAULT_AUTH_DB_PATH = 'D:\\databases\\auth.db';

export const getAuthDbPath = (): string => {
  const configured = process.env.AUTH_DB_PATH?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_AUTH_DB_PATH;
};

interface UserRow {
  id: string;
  email: string;
  password_salt: Buffer;
  password_hash: Buffer;
  is_admin: number;
  full_name: string | null;
  company_name: string | null;
  created_at: number;
  updated_at: number;
}

const rowToUser = (row: UserRow): AuthUser => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name ?? undefined,
  companyName: row.company_name ?? undefined,
  isAdmin: row.is_admin === 1,
});

/**
 * Open (and migrate) the central auth database. Creates the parent directory and
 * the users table if needed. Caller owns closing the handle.
 */
export const openAuthDb = (dbPath: string = getAuthDbPath()): Database.Database => {
  const dir = dirname(dbPath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_salt BLOB NOT NULL,
      password_hash BLOB NOT NULL,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      full_name     TEXT,
      company_name  TEXT,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  `);
  return db;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export interface UpsertUserInput {
  email: string;
  password: string;
  isAdmin?: boolean;
  fullName?: string;
  companyName?: string;
}

/**
 * Insert a user, or update the password/profile of an existing user matched by email.
 * Returns the stored user (without credential material).
 */
export const upsertUser = async (
  db: Database.Database,
  input: UpsertUserInput,
): Promise<AuthUser> => {
  const email = normalizeEmail(input.email);
  const { salt, hash } = await hashPassword(input.password);
  const now = Date.now();
  const isAdmin = input.isAdmin ? 1 : 0;

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users
         SET password_salt = ?, password_hash = ?, is_admin = ?,
             full_name = ?, company_name = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      salt,
      hash,
      isAdmin,
      input.fullName ?? null,
      input.companyName ?? null,
      now,
      existing.id,
    );
    return getUserByEmail(db, email) as AuthUser;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users
       (id, email, password_salt, password_hash, is_admin, full_name, company_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    email,
    salt,
    hash,
    isAdmin,
    input.fullName ?? null,
    input.companyName ?? null,
    now,
    now,
  );

  return {
    id,
    email,
    fullName: input.fullName,
    companyName: input.companyName,
    isAdmin: input.isAdmin ?? false,
  };
};

export const getUserByEmail = (
  db: Database.Database,
  email: string,
): AuthUser | null => {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizeEmail(email)) as UserRow | undefined;
  return row ? rowToUser(row) : null;
};

/**
 * Verify an email/password pair against the central store.
 * Always performs a password comparison (even when the email is unknown) to avoid
 * leaking which emails exist via response timing.
 */
export const authenticateUser = async (
  db: Database.Database,
  email: string,
  password: string,
): Promise<AuthUser | null> => {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizeEmail(email)) as UserRow | undefined;

  if (!row) {
    // Dummy verification against a throwaway salt to keep timing uniform.
    const { salt, hash } = await hashPassword('vibetech-dummy-password');
    await verifyPassword(password, salt, hash);
    return null;
  }

  const ok = await verifyPassword(password, row.password_salt, row.password_hash);
  return ok ? rowToUser(row) : null;
};
