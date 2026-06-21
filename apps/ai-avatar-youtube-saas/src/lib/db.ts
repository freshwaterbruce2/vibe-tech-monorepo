import AppDatabase from "@vibetech/db-app";
import { env } from "@/lib/env";

const db = AppDatabase.getInstance({ path: env.APP_DB_PATH }).getDatabase();

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS avatar_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT,
      gcs_path TEXT NOT NULL UNIQUE,
      signed_url TEXT,
      signed_url_expires INTEGER,
      mime_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS render_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'queued',
      script_prompt TEXT NOT NULL,
      voice_id TEXT NOT NULL,
      audio_sample_rate INTEGER NOT NULL DEFAULT 16000,
      asset_paths TEXT NOT NULL,
      viseme_mapping TEXT,
      output_url TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT NOT NULL,
      user_id TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      expires_at INTEGER,
      dpop_jkt TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (provider, user_id)
    );

    CREATE TABLE IF NOT EXISTS youtube_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      render_job_id INTEGER NOT NULL,
      video_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'uploaded',
      title TEXT NOT NULL,
      privacy_status TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (render_job_id) REFERENCES render_jobs(id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT UNIQUE,
      plan_tier TEXT DEFAULT 'hobby',
      status TEXT DEFAULT 'active',
      current_period_end INTEGER DEFAULT 0,
      video_credits INTEGER DEFAULT 10,
      updated_at INTEGER NOT NULL
    );
  `);
}

export function insertAvatarAsset(opts: {
  ownerId?: string;
  gcsPath: string;
  signedUrl: string;
  signedUrlExpires: number;
  mimeType: string;
}) {
  const stmt = db.prepare(
    `INSERT INTO avatar_assets (owner_id, gcs_path, signed_url, signed_url_expires, mime_type)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(gcs_path) DO UPDATE SET
       signed_url = excluded.signed_url,
       signed_url_expires = excluded.signed_url_expires`
  );
  return stmt.run(
    opts.ownerId ?? null,
    opts.gcsPath,
    opts.signedUrl,
    opts.signedUrlExpires,
    opts.mimeType
  );
}

export function insertRenderJob(opts: {
  scriptPrompt: string;
  voiceId: string;
  audioSampleRate: number;
  assetPaths: string[];
  visemeMapping?: Record<string, unknown>;
}) {
  const stmt = db.prepare(
    `INSERT INTO render_jobs (status, script_prompt, voice_id, audio_sample_rate, asset_paths, viseme_mapping)
     VALUES ('queued', ?, ?, ?, ?, ?)`
  );
  return stmt.run(
    opts.scriptPrompt,
    opts.voiceId,
    opts.audioSampleRate,
    JSON.stringify(opts.assetPaths),
    opts.visemeMapping ? JSON.stringify(opts.visemeMapping) : null
  );
}

export function getRenderJob(id: number) {
  return db
    .prepare("SELECT * FROM render_jobs WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
}

export function updateRenderStatus(
  id: number,
  status: string,
  outputUrl?: string | null,
  errorMessage?: string | null
) {
  const stmt = db.prepare(
    `UPDATE render_jobs
     SET status = ?, output_url = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  );
  return stmt.run(status, outputUrl ?? null, errorMessage ?? null, id);
}

export function upsertOAuthToken(opts: {
  provider: string;
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  expiresAt: number;
}) {
  const stmt = db.prepare(
    `INSERT INTO oauth_tokens (provider, user_id, access_token_encrypted, refresh_token_encrypted, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider, user_id) DO UPDATE SET
       access_token_encrypted = excluded.access_token_encrypted,
       refresh_token_encrypted = COALESCE(excluded.refresh_token_encrypted, oauth_tokens.refresh_token_encrypted),
       expires_at = excluded.expires_at,
       updated_at = CURRENT_TIMESTAMP`
  );
  return stmt.run(
    opts.provider,
    opts.userId,
    opts.accessTokenEncrypted,
    opts.refreshTokenEncrypted ?? null,
    opts.expiresAt
  );
}

export function getOAuthToken(provider: string, userId: string) {
  return db
    .prepare("SELECT * FROM oauth_tokens WHERE provider = ? AND user_id = ?")
    .get(provider, userId) as
    | {
        provider: string;
        user_id: string;
        access_token_encrypted: string;
        refresh_token_encrypted: string | null;
        expires_at: number;
      }
    | undefined;
}

export function deleteOAuthToken(provider: string, userId: string) {
  return db.prepare("DELETE FROM oauth_tokens WHERE provider = ? AND user_id = ?").run(provider, userId);
}

export function getCompletedRenderJobs() {
  return db
    .prepare("SELECT * FROM render_jobs WHERE status = 'completed' AND output_url IS NOT NULL ORDER BY created_at DESC")
    .all() as Array<Record<string, unknown>>;
}

export function insertYouTubeUpload(opts: {
  userId: string;
  renderJobId: number;
  videoId: string;
  status: string;
  title: string;
  privacyStatus: string;
}) {
  const stmt = db.prepare(
    `INSERT INTO youtube_uploads (user_id, render_job_id, video_id, status, title, privacy_status)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  return stmt.run(opts.userId, opts.renderJobId, opts.videoId, opts.status, opts.title, opts.privacyStatus);
}

export function getYouTubeUploadsByUser(userId: string) {
  return db
    .prepare("SELECT * FROM youtube_uploads WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<Record<string, unknown>>;
}

export interface UserSubscription {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planTier: "hobby" | "startup" | "growth" | "saas_scale";
  status: "active" | "canceled" | "trialing" | "past_due" | "incomplete" | "unpaid";
  currentPeriodEnd: number;
  videoCredits: number;
  updatedAt: number;
}

export function upsertSubscription(sub: Omit<UserSubscription, "updatedAt">) {
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(
    `INSERT INTO subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, current_period_end, video_credits, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      plan_tier = excluded.plan_tier,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      video_credits = excluded.video_credits,
      updated_at = excluded.updated_at`
  );
  return stmt.run(
    sub.userId,
    sub.stripeCustomerId,
    sub.stripeSubscriptionId,
    sub.planTier,
    sub.status,
    sub.currentPeriodEnd,
    sub.videoCredits,
    now
  );
}

export function getSubscriptionByUserId(userId: string): UserSubscription | undefined {
  return db
    .prepare(
      `SELECT
        user_id AS userId,
        stripe_customer_id AS stripeCustomerId,
        stripe_subscription_id AS stripeSubscriptionId,
        plan_tier AS planTier,
        status,
        current_period_end AS currentPeriodEnd,
        video_credits AS videoCredits,
        updated_at AS updatedAt
      FROM subscriptions WHERE user_id = ?`
    )
    .get(userId) as UserSubscription | undefined;
}

export function getUserIdByStripeCustomerId(customerId: string): string | undefined {
  const row = db
    .prepare("SELECT user_id AS userId FROM subscriptions WHERE stripe_customer_id = ?")
    .get(customerId) as { userId: string } | undefined;
  return row?.userId;
}

export function deductVideoCredit(userId: string): boolean {
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT video_credits AS videoCredits FROM subscriptions WHERE user_id = ?").get(userId) as
      | { videoCredits: number }
      | undefined;
    const credits = row?.videoCredits ?? 0;
    if (credits <= 0) return false;
    db.prepare("UPDATE subscriptions SET video_credits = video_credits - 1, updated_at = ? WHERE user_id = ?").run(
      Math.floor(Date.now() / 1000),
      userId
    );
    return true;
  });
  return tx();
}

