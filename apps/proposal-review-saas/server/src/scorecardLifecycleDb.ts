import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type {
  AbandonedScorecardDelivery,
  AbandonedScorecardDay,
  CreateScorecardEventInput,
  DueAbandonedScorecardEmail,
  GrantUserEntitlementInput,
  ScorecardEvent,
  ScorecardLifecycleRepository,
  UserEntitlementRecord,
} from './scorecardLifecycle.js';
import { GENERATED_FEATURES } from './entitlements.js';
import type { ProposalReviewInput } from './reviewEngine.js';

interface ScorecardEventRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  project_type: string;
  proposal_fingerprint: string;
  score: number | null;
  created_at: string;
  tier_at_creation: string;
  sequence_day: AbandonedScorecardDay;
}

interface UserEntitlementRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  feature_key: string;
  active: number;
  source: string;
  created_at: string;
  updated_at: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DATABASE_PATH =
  process.platform === 'win32'
    ? 'D:\\databases\\proposal-review-saas.db'
    : '/data/proposal-review-saas.db';

export function createScorecardLifecycleRepository(
  db: Database.Database = openScorecardLifecycleDb(),
): ScorecardLifecycleRepository {
  migrateScorecardLifecycleDb(db);

  return {
    recordFreeScorecard(input) {
      return recordFreeScorecard(db, input);
    },
    grantUserEntitlement(input) {
      return grantUserEntitlement(db, input);
    },
    findDueAbandonedScorecardEmails(now, days, limit) {
      return findDueAbandonedScorecardEmails(db, now, days, limit);
    },
    reserveAbandonedScorecardEmail(candidate, now) {
      return reserveAbandonedScorecardEmail(db, candidate, now);
    },
    markAbandonedScorecardEmailDelivered(delivery, now) {
      markAbandonedScorecardEmailDelivered(db, delivery, now);
    },
    markAbandonedScorecardEmailFailed(candidate, errorMessage, now) {
      markAbandonedScorecardEmailFailed(db, candidate, errorMessage, now);
    },
  };
}

export function getScorecardLifecycleDatabasePath(): string {
  const dbPath = process.env.PROPOSAL_REVIEW_DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
  assertDatabasePathInAllowedRuntimeStore(dbPath);
  return dbPath;
}

export function openScorecardLifecycleDb(): Database.Database {
  const dbPath = getScorecardLifecycleDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function recordFreeScorecard(
  db: Database.Database,
  input: CreateScorecardEventInput,
): ScorecardEvent {
  const now = input.now ?? new Date();
  const event: ScorecardEvent = {
    id: crypto.randomUUID(),
    userId: input.user?.id ?? null,
    userEmail: normalizeEmail(input.user?.email ?? input.fallbackEmail),
    userName: normalizeOptionalString(input.user?.fullName ?? input.fallbackName),
    projectType: input.input.projectType,
    proposalFingerprint: hashProposalInput(input.input),
    score: normalizeScore(input.reviewScore),
    createdAt: now.toISOString(),
    tierAtCreation: normalizeTier(input.tierHeader),
  };

  db.prepare(
    `
    INSERT INTO scorecard_events (
      id,
      user_id,
      user_email,
      user_name,
      project_type,
      proposal_fingerprint,
      score,
      created_at,
      tier_at_creation
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    event.id,
    event.userId,
    event.userEmail,
    event.userName,
    event.projectType,
    event.proposalFingerprint,
    event.score,
    event.createdAt,
    event.tierAtCreation,
  );

  return event;
}

function grantUserEntitlement(
  db: Database.Database,
  input: GrantUserEntitlementInput,
): UserEntitlementRecord {
  const now = input.now ?? new Date();
  const userId = normalizeOptionalString(input.userId ?? undefined);
  const userEmail = normalizeEmail(input.userEmail ?? undefined);
  const source = normalizeOptionalString(input.source) ?? 'billing';

  if (!userId && !userEmail) {
    throw new Error('Cannot grant entitlement without a user id or user email');
  }

  if (userId) {
    db.prepare(
      `
      INSERT INTO proposal_user_entitlements (
        id,
        user_id,
        user_email,
        feature_key,
        active,
        source,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(user_id, feature_key) DO UPDATE SET
        user_email = COALESCE(excluded.user_email, proposal_user_entitlements.user_email),
        active = 1,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    ).run(
      crypto.randomUUID(),
      userId,
      userEmail,
      input.featureKey,
      source,
      now.toISOString(),
      now.toISOString(),
    );
  } else {
    db.prepare(
      `
      INSERT INTO proposal_user_entitlements (
        id,
        user_id,
        user_email,
        feature_key,
        active,
        source,
        created_at,
        updated_at
      )
      VALUES (?, NULL, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(user_email, feature_key) DO UPDATE SET
        active = 1,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    ).run(
      crypto.randomUUID(),
      userEmail,
      input.featureKey,
      source,
      now.toISOString(),
      now.toISOString(),
    );
  }

  const row = db
    .prepare(
      `
      SELECT
        id,
        user_id,
        user_email,
        feature_key,
        active,
        source,
        created_at,
        updated_at
      FROM proposal_user_entitlements
      WHERE feature_key = ?
        AND (
          (? IS NOT NULL AND user_id = ?)
          OR (? IS NOT NULL AND user_email = ?)
        )
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    )
    .get(input.featureKey, userId, userId, userEmail, userEmail) as
    | UserEntitlementRow
    | undefined;

  if (!row) {
    throw new Error('Failed to load granted user entitlement');
  }

  return mapUserEntitlementRow(row);
}

function findDueAbandonedScorecardEmails(
  db: Database.Database,
  now: Date,
  days: readonly AbandonedScorecardDay[],
  limit: number,
): DueAbandonedScorecardEmail[] {
  const rows: ScorecardEventRow[] = [];
  const perDayLimit = Math.max(1, Math.ceil(limit / Math.max(days.length, 1)));
  const statement = db.prepare(`
    SELECT
      e.id,
      e.user_id,
      e.user_email,
      e.user_name,
      e.project_type,
      e.proposal_fingerprint,
      e.score,
      e.created_at,
      e.tier_at_creation,
      ? AS sequence_day
    FROM scorecard_events e
    WHERE e.source = 'free_review'
      AND e.user_email IS NOT NULL
      AND e.created_at <= ?
      AND NOT EXISTS (
        SELECT 1
        FROM proposal_user_entitlements entitlement
        WHERE entitlement.feature_key = ?
          AND entitlement.active = 1
          AND (
            (e.user_id IS NOT NULL AND entitlement.user_id = e.user_id)
            OR LOWER(entitlement.user_email) = e.user_email
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM abandoned_scorecard_emails sent
        WHERE sent.scorecard_event_id = e.id
          AND sent.sequence_day = ?
      )
    ORDER BY e.created_at ASC
    LIMIT ?
  `);

  for (const day of days) {
    const cutoff = new Date(now.getTime() - day * DAY_IN_MS).toISOString();
    rows.push(
      ...(statement.all(
        day,
        cutoff,
        GENERATED_FEATURES.premiumRoute,
        day,
        perDayLimit,
      ) as ScorecardEventRow[]),
    );
  }

  return rows.slice(0, limit).map(mapDueScorecardRow);
}

function reserveAbandonedScorecardEmail(
  db: Database.Database,
  candidate: DueAbandonedScorecardEmail,
  now: Date,
): boolean {
  const result = db
    .prepare(
      `
      INSERT OR IGNORE INTO abandoned_scorecard_emails (
        id,
        scorecard_event_id,
        user_email,
        sequence_day,
        status,
        reserved_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 'sending', ?, ?, ?)
    `,
    )
    .run(
      crypto.randomUUID(),
      candidate.id,
      candidate.userEmail,
      candidate.day,
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );

  return result.changes === 1;
}

function markAbandonedScorecardEmailDelivered(
  db: Database.Database,
  delivery: AbandonedScorecardDelivery,
  now: Date,
): void {
  db.prepare(
    `
    UPDATE abandoned_scorecard_emails
    SET status = ?,
        provider_id = ?,
        sent_at = ?,
        error_message = NULL,
        updated_at = ?
    WHERE scorecard_event_id = ?
      AND sequence_day = ?
  `,
  ).run(
    delivery.status,
    delivery.providerId,
    now.toISOString(),
    now.toISOString(),
    delivery.scorecardEventId,
    delivery.day,
  );
}

function markAbandonedScorecardEmailFailed(
  db: Database.Database,
  candidate: DueAbandonedScorecardEmail,
  errorMessage: string,
  now: Date,
): void {
  db.prepare(
    `
    UPDATE abandoned_scorecard_emails
    SET status = 'failed',
        error_message = ?,
        updated_at = ?
    WHERE scorecard_event_id = ?
      AND sequence_day = ?
  `,
  ).run(errorMessage.slice(0, 1000), now.toISOString(), candidate.id, candidate.day);
}

function migrateScorecardLifecycleDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scorecard_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      source TEXT NOT NULL DEFAULT 'free_review',
      project_type TEXT NOT NULL,
      proposal_fingerprint TEXT NOT NULL,
      score INTEGER,
      created_at TEXT NOT NULL,
      tier_at_creation TEXT NOT NULL DEFAULT 'free'
    );

    CREATE INDEX IF NOT EXISTS idx_scorecard_events_email_created
      ON scorecard_events (user_email, created_at);

    CREATE INDEX IF NOT EXISTS idx_scorecard_events_source_created
      ON scorecard_events (source, created_at);

    CREATE TABLE IF NOT EXISTS proposal_user_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      feature_key TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'billing',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (user_id IS NOT NULL OR user_email IS NOT NULL),
      UNIQUE (user_id, feature_key),
      UNIQUE (user_email, feature_key)
    );

    CREATE INDEX IF NOT EXISTS idx_proposal_user_entitlements_email_feature
      ON proposal_user_entitlements (user_email, feature_key, active);

    CREATE TABLE IF NOT EXISTS abandoned_scorecard_emails (
      id TEXT PRIMARY KEY,
      scorecard_event_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      sequence_day INTEGER NOT NULL CHECK (sequence_day IN (1, 3, 7)),
      status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'mocked', 'failed')),
      provider_id TEXT,
      error_message TEXT,
      reserved_at TEXT NOT NULL,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (scorecard_event_id) REFERENCES scorecard_events (id) ON DELETE CASCADE,
      UNIQUE (scorecard_event_id, sequence_day)
    );

    CREATE INDEX IF NOT EXISTS idx_abandoned_scorecard_emails_user_day
      ON abandoned_scorecard_emails (user_email, sequence_day);
  `);
  addColumnIfMissing(db, 'scorecard_events', 'score', 'INTEGER');
}

function assertDatabasePathInAllowedRuntimeStore(dbPath: string): void {
  const normalized = path.resolve(dbPath);
  const isWindowsDataPath = /^[dD]:\\/.test(normalized);
  const isRailwayVolumePath = normalized === '/data' || normalized.startsWith('/data/');

  if (!isWindowsDataPath && !isRailwayVolumePath) {
    throw new Error(
      `PROPOSAL_REVIEW_DATABASE_PATH must be on D:\\ locally or /data in production (got: ${normalized})`,
    );
  }
}

function mapDueScorecardRow(row: ScorecardEventRow): DueAbandonedScorecardEmail {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    projectType: row.project_type,
    proposalFingerprint: row.proposal_fingerprint,
    score: row.score,
    createdAt: row.created_at,
    tierAtCreation: row.tier_at_creation,
    day: row.sequence_day,
  };
}

function mapUserEntitlementRow(row: UserEntitlementRow): UserEntitlementRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    featureKey: row.feature_key,
    active: row.active === 1,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hashProposalInput(input: ProposalReviewInput): string {
  const normalized = JSON.stringify({
    projectType: input.projectType.trim().toLowerCase(),
    proposalText: input.proposalText.trim().replace(/\s+/g, ' '),
    priceUsd: input.priceUsd,
    turnaroundDays: input.turnaroundDays,
    revisionRounds: input.revisionRounds,
  });

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizeTier(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const tier = rawValue?.trim().toLowerCase();
  return tier && tier.length > 0 ? tier : 'free';
}

function normalizeEmail(value: string | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email && email.includes('@') ? email : null;
}

function normalizeOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeScore(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function addColumnIfMissing(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  if (rows.some((row) => row.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}
