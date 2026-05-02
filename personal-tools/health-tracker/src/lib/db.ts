import Dexie, { type EntityTable } from 'dexie';
import type { DailyEntry, HabitDefinition, SymptomEntry } from './types';
import { STARTER_HABITS } from './habits';

export class HealthTrackerDB extends Dexie {
  entries!: EntityTable<DailyEntry, 'id'>;
  habits!: EntityTable<HabitDefinition, 'id'>;
  symptoms!: EntityTable<SymptomEntry, 'id'>;

  constructor() {
    super('HealthTrackerDB');
    this.version(1).stores({
      entries: '++id, &date, createdAt',
      habits: 'id, dimension, enabled',
    });
    this.version(2).stores({
      entries: '++id, &date, createdAt, valence',
      habits: 'id, dimension, enabled',
    });
    this.version(3).stores({
      entries: '++id, &date, createdAt, valence',
      habits: 'id, dimension, enabled',
      symptoms: '++id, date, symptom, severity, createdAt',
    });
  }
}

export const db = new HealthTrackerDB();

export async function ensureStarterHabits(): Promise<void> {
  const count = await db.habits.count();
  if (count === 0) {
    await db.habits.bulkAdd(STARTER_HABITS);
  }
}

export function todayKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
