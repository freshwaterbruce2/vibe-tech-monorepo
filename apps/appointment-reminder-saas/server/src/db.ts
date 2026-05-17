import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATABASE_PATH =
  process.platform === 'win32'
    ? 'D:\\databases\\appointment-reminder-saas.db'
    : '/data/appointment-reminder-saas.db';

const assertDatabasePathInAllowedRuntimeStore = (dbPath: string): void => {
  const normalized = path.resolve(dbPath);
  const isWindowsDataPath = /^[dD]:\\/.test(normalized);
  const isRailwayVolumePath = normalized === '/data' || normalized.startsWith('/data/');

  if (!isWindowsDataPath && !isRailwayVolumePath) {
    throw new Error(
      `APPOINTMENTS_DATABASE_PATH must be on D:\\ locally or /data in Railway (got: ${normalized})`,
    );
  }
};

export const getDatabasePath = (): string => {
  const dbPath = process.env.APPOINTMENTS_DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
  assertDatabasePathInAllowedRuntimeStore(dbPath);
  return dbPath;
};

export const openDb = (): Database.Database => {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seedDemoAppointments(db);
  return db;
};

const migrate = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_contact TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'no-show', 'rescheduled')),
      reschedule_token TEXT NOT NULL UNIQUE,
      last_reminder_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time
      ON appointments (tenant_id, appointment_time);

    CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status
      ON appointments (tenant_id, status);

    CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_token
      ON appointments (reschedule_token);
  `);
};

const seedDemoAppointments = (db: Database.Database): void => {
  const count = db
    .prepare('SELECT COUNT(*) AS count FROM appointments WHERE tenant_id = ?')
    .get('demo-clinic') as { count: number };

  if (count.count > 0) {
    return;
  }

  const now = Date.now();
  const insert = db.prepare(`
    INSERT INTO appointments (
      id,
      tenant_id,
      patient_name,
      patient_contact,
      appointment_time,
      status,
      reschedule_token,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [offsetHours, patientName, patientContact, status] of [
    [3, 'Maya Carter', 'maya@example.com', 'scheduled'],
    [25, 'Noah Lee', '+15551234567', 'scheduled'],
    [-72, 'Avery Morgan', 'avery@example.com', 'no-show'],
    [-48, 'Jordan Patel', '+15557654321', 'completed'],
  ] as const) {
    const timestamp = new Date(now + offsetHours * 60 * 60 * 1000).toISOString();
    insert.run(
      crypto.randomUUID(),
      'demo-clinic',
      patientName,
      patientContact,
      timestamp,
      status,
      crypto.randomUUID(),
      new Date().toISOString(),
      new Date().toISOString(),
    );
  }
};
