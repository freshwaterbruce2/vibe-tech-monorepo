import { describe, expect, it } from 'vitest';

import { FLAT_NOTES, NATURAL_NOTES, SHARP_NOTES, getTier, pick, shuffle } from '../musicNotesData';

describe('musicNotesData', () => {
  it('selects expected tier thresholds', () => {
    expect(getTier(0).name).toBe('White Keys');
    expect(getTier(7).name).toBe('White Keys');
    expect(getTier(8).name).toBe('Add Sharps');
    expect(getTier(17).name).toBe('Add Sharps');
    expect(getTier(18).name).toBe('All Notes');
  });

  it('includes baseline note sets', () => {
    expect(NATURAL_NOTES.length).toBeGreaterThan(0);
    expect(SHARP_NOTES.length).toBeGreaterThan(0);
    expect(FLAT_NOTES.length).toBeGreaterThan(0);
  });

  it('shuffle preserves all items', () => {
    const source = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const shuffled = shuffle(source);
    expect(shuffled).toHaveLength(source.length);
    expect([...shuffled].sort()).toEqual([...source].sort());
  });

  it('pick returns an item from the array', () => {
    const source = ['C', 'D', 'E'];
    expect(source).toContain(pick(source));
  });
});
