import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { DailyEntry } from '../lib/types';

export function useHistory(limit = 60): DailyEntry[] | undefined {
  return useLiveQuery(
    () => db.entries.orderBy('date').reverse().limit(limit).toArray(),
    []
  );
}
