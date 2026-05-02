import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayKey } from '../lib/db';
import type { DailyEntry, Scores } from '../lib/types';

export function useTodayEntry() {
  const date = todayKey();
  const entry = useLiveQuery(() => db.entries.where('date').equals(date).first(), [date]);

  async function save(patch: Partial<Omit<DailyEntry, 'id' | 'date' | 'createdAt'>>): Promise<void> {
    const now = Date.now();
    const existing = await db.entries.where('date').equals(date).first();
    if (existing && existing.id !== undefined) {
      await db.entries.update(existing.id, { ...patch, updatedAt: now });
      return;
    }
    const newEntry: Omit<DailyEntry, 'id'> = {
      date,
      scores: {},
      habits: {},
      gratitude: '',
      reflection: '',
      createdAt: now,
      updatedAt: now,
      ...patch,
    };
    await db.entries.add(newEntry as DailyEntry);
  }

  async function setScore(dim: keyof Scores, value: number): Promise<void> {
    const current = entry?.scores ?? {};
    await save({ scores: { ...current, [dim]: value } });
  }

  async function toggleHabit(habitId: string): Promise<void> {
    const current = entry?.habits ?? {};
    await save({ habits: { ...current, [habitId]: !current[habitId] } });
  }

  return { entry, date, save, setScore, toggleHabit };
}
