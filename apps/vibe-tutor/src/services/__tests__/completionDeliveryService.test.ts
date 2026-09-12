import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FocusSession, HomeworkItem } from '../../types';

let raw: string | null = null;
const save = vi.fn(async (value: string) => { raw = value; });
const get = vi.fn(async () => raw);
const homeworkRead = vi.fn(async () => [] as HomeworkItem[]);
const focusRead = vi.fn(async () => [] as FocusSession[]);
vi.mock('../dataStore', () => ({ dataStore: {
  getCompletionDeliveryRecord: get, saveCompletionDeliveryRecord: save,
  getHomeworkItems: homeworkRead, getFocusSessions: focusRead,
} }));
const service = await import('../completionDeliveryService');
const homework = (id = 'h1', completedDate = Date.UTC(2026, 5, 30, 12)): HomeworkItem => ({ id, subject: 'Math', title: 'Fractions', dueDate: '2026-06-30', completed: true, completedDate });
const focus = (id = 'f1'): FocusSession => ({ id, startTime: 1_000, endTime: 61_000, duration: 1, completed: true });
const localDay = (n: number) => { const d = new Date(n); return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('completionDeliveryService parser and preparation', () => {
  beforeEach(() => { raw = null; vi.clearAllMocks(); get.mockImplementation(async () => raw); save.mockImplementation(async value => { raw = value; }); homeworkRead.mockResolvedValue([]); focusRead.mockResolvedValue([]); });

  it('rejects absent-malformed JSON, version, unknown keys, duplicates, contradictory states, oversize, and 501 entries without overwrite', async () => {
    for (const value of [
      '{', JSON.stringify({ version: 2, entries: [] }), JSON.stringify({ version: 1, entries: [], extra: true }), 'x'.repeat(1024 * 1024 + 1),
    ]) { raw = value; await expect(service.prepareHomeworkCompletionDelivery(homework())).rejects.toThrow(); expect(raw).toBe(value); }
    raw = null;
    const entry = await service.prepareHomeworkCompletionDelivery(homework('seed'));
    const base = JSON.parse(raw!).entries[0];
    raw = JSON.stringify({ version: 1, entries: [base, base] });
    await expect(service.prepareHomeworkCompletionDelivery(homework('next'))).rejects.toThrow();
    raw = JSON.stringify({ version: 1, entries: [{ ...base, sourceState: 'prepared', token: { ...base.token, state: 'settled' } }] });
    await expect(service.prepareHomeworkCompletionDelivery(homework('next'))).rejects.toThrow();
    raw = JSON.stringify({ version: 1, entries: Array.from({ length: 501 }, (_, i) => ({ ...base, deliveryId: `completion-delivery:homework:s${i}`, source: { ...base.source, id: `s${i}` }, token: { ...base.token, operationId: `homework-complete:s${i}` }, achievement: { ...base.achievement, eventId: `homework-completed:s${i}` } })) });
    await expect(service.prepareHomeworkCompletionDelivery(homework('next'))).rejects.toThrow();
    expect(entry.deliveryId).toBe('completion-delivery:homework:seed');
  });

  it('derives exact stable Homework/Focus payloads and valid local days before returning', async () => {
    const item = homework();
    await expect(service.prepareHomeworkCompletionDelivery(item)).resolves.toMatchObject({
      deliveryId: 'completion-delivery:homework:h1', token: { amount: 10, reason: 'Homework completed', operationId: 'homework-complete:h1' }, achievement: { eventType: 'TASK_COMPLETED', eventId: 'homework-completed:h1', payload: { completionDay: localDay(item.completedDate!) } },
    });
    await expect(service.prepareFocusCompletionDelivery(focus())).resolves.toMatchObject({
      deliveryId: 'completion-delivery:focus:f1', token: { amount: 1, reason: 'Focus session', operationId: 'focus-session:f1' }, achievement: { eventType: 'FOCUS_SESSION_COMPLETED', eventId: 'focus-completed:f1', payload: { duration: 1, completionDay: localDay(61_000) } },
    });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed source fields, Date-range timestamps, and a long source that would self-corrupt', async () => {
    await expect(service.prepareHomeworkCompletionDelivery({ ...homework(), id: 'bad id' })).rejects.toThrow();
    await expect(service.prepareHomeworkCompletionDelivery({ ...homework(), title: '   ' })).rejects.toThrow();
    await expect(service.prepareFocusCompletionDelivery({ ...focus(), points: -1 })).rejects.toThrow();
    await expect(service.prepareFocusCompletionDelivery({ ...focus(), endTime: 9_000_000_000_000_000 })).rejects.toThrow();
    await expect(service.prepareHomeworkCompletionDelivery(homework('a'.repeat(121)))).rejects.toThrow();
    const boundary = await service.prepareHomeworkCompletionDelivery(homework('a'.repeat(120)));
    expect(boundary.deliveryId.length).toBeLessThanOrEqual(160);
  });

  it('persists before returning, propagates failure, is exact-idempotent, rejects conflict, and serializes distinct preparations', async () => {
    let released = false;
    save.mockImplementationOnce(async value => { raw = value; released = true; });
    await service.prepareHomeworkCompletionDelivery(homework());
    expect(released).toBe(true);
    save.mockRejectedValueOnce(new Error('write failed'));
    await expect(service.prepareHomeworkCompletionDelivery(homework('fail'))).rejects.toThrow('write failed');
    await service.prepareHomeworkCompletionDelivery(homework());
    expect(save).toHaveBeenCalledTimes(2);
    await expect(service.prepareHomeworkCompletionDelivery(homework('h1', homework().completedDate! + 1))).rejects.toThrow('conflict');
    raw = null;
    await Promise.all([service.prepareHomeworkCompletionDelivery(homework('a')), service.prepareHomeworkCompletionDelivery(homework('b'))]);
    expect(JSON.parse(raw!).entries.map((e: { deliveryId: string }) => e.deliveryId)).toEqual(['completion-delivery:homework:a', 'completion-delivery:homework:b']);
  });

  it('does not read primary sources for empty or fully settled journals', async () => {
    await expect(service.getRecoverableCompletionDeliveries()).resolves.toEqual([]);
    expect(homeworkRead).not.toHaveBeenCalled(); expect(focusRead).not.toHaveBeenCalled();
    const item = homework(); await service.prepareHomeworkCompletionDelivery(item);
    homeworkRead.mockResolvedValue([item]); await service.getRecoverableCompletionDeliveries();
    await service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'token');
    await service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'achievement');
    homeworkRead.mockClear(); focusRead.mockClear();
    await expect(service.getRecoverableCompletionDeliveries()).resolves.toEqual([]);
    expect(homeworkRead).not.toHaveBeenCalled(); expect(focusRead).not.toHaveBeenCalled();
  });

  it('promotes exact Homework/Focus sources, cancels absent/uncompleted sources, and retains changed facts', async () => {
    const item = homework(); await service.prepareHomeworkCompletionDelivery(item);
    homeworkRead.mockResolvedValue([item]);
    await expect(service.getRecoverableCompletionDeliveries()).resolves.toEqual([expect.objectContaining({ sourceState: 'confirmed' })]);
    raw = null; await service.prepareFocusCompletionDelivery(focus()); focusRead.mockResolvedValue([focus()]);
    await expect(service.getRecoverableCompletionDeliveries()).resolves.toEqual([expect.objectContaining({ sourceState: 'confirmed', kind: 'focus' })]);
    raw = null; await service.prepareHomeworkCompletionDelivery(item); homeworkRead.mockResolvedValue([{ ...item, completed: false }]);
    await expect(service.getRecoverableCompletionDeliveries()).resolves.toEqual([]);
    expect(JSON.parse(raw!).entries[0].sourceState).toBe('cancelled');
    raw = null; await service.prepareHomeworkCompletionDelivery(item); homeworkRead.mockResolvedValue([{ ...item, completedDate: item.completedDate! + 1 }]); save.mockClear();
    await expect(service.getRecoverableCompletionDeliveries()).rejects.toThrow('conflicts'); expect(save).not.toHaveBeenCalled();
  });

  it('propagates source-read and confirmation-save failures without overwriting the prepared journal', async () => {
    const item = homework(); await service.prepareHomeworkCompletionDelivery(item); const beforeReadFailure = raw;
    homeworkRead.mockRejectedValueOnce(new Error('source read failed'));
    await expect(service.getRecoverableCompletionDeliveries()).rejects.toThrow('source read failed'); expect(raw).toBe(beforeReadFailure);
    homeworkRead.mockResolvedValue([item]); save.mockRejectedValueOnce(new Error('confirmation save failed'));
    await expect(service.getRecoverableCompletionDeliveries()).rejects.toThrow('confirmation save failed'); expect(raw).toBe(beforeReadFailure);
  });

  it('rechecks confirmed pending entries, leaves failures pending, and supports cancelled re-preparation', async () => {
    const item = homework(); await service.prepareHomeworkCompletionDelivery(item); homeworkRead.mockResolvedValue([item]); await service.getRecoverableCompletionDeliveries();
    homeworkRead.mockResolvedValue([{ ...item, completedDate: item.completedDate! + 1 }]);
    await expect(service.getRecoverableCompletionDeliveries()).rejects.toThrow('conflicts');
    raw = null; homeworkRead.mockResolvedValue([]); await service.prepareHomeworkCompletionDelivery(item); await service.getRecoverableCompletionDeliveries();
    const changed = await service.prepareHomeworkCompletionDelivery({ ...item, completedDate: item.completedDate! + 1 });
    expect(changed.source.completedDate).toBe(item.completedDate! + 1);
  });

  it('settles legs independently and idempotently, retaining pending state across a failed write and retry', async () => {
    const item = homework(); await service.prepareHomeworkCompletionDelivery(item); homeworkRead.mockResolvedValue([item]); await service.getRecoverableCompletionDeliveries();
    await service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'token');
    expect(JSON.parse(raw!).entries[0]).toMatchObject({ token: { state: 'settled' }, achievement: { state: 'pending' } });
    save.mockClear(); await service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'token'); expect(save).not.toHaveBeenCalled();
    save.mockRejectedValueOnce(new Error('write failed'));
    await expect(service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'achievement')).rejects.toThrow('write failed');
    expect(JSON.parse(raw!).entries[0].achievement.state).toBe('pending');
    await service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'achievement');
    await expect(service.markCompletionDeliveryLegSettled('unknown', 'token')).rejects.toThrow();
  });

  it('cancels confirmed partial settlements on absent source without reopening them', async () => {
    const item = homework(); await service.prepareHomeworkCompletionDelivery(item); homeworkRead.mockResolvedValue([item]); await service.getRecoverableCompletionDeliveries();
    await service.markCompletionDeliveryLegSettled('completion-delivery:homework:h1', 'token'); homeworkRead.mockResolvedValue([]);
    await expect(service.getRecoverableCompletionDeliveries()).resolves.toEqual([]);
    expect(JSON.parse(raw!).entries[0]).toMatchObject({ sourceState: 'cancelled', token: { state: 'settled' }, achievement: { state: 'pending' } });
    await expect(service.prepareHomeworkCompletionDelivery(item)).resolves.toMatchObject({ sourceState: 'cancelled' });
    await expect(service.prepareHomeworkCompletionDelivery({ ...item, completedDate: item.completedDate! + 1 })).rejects.toThrow('conflict');
  });

  it('reads only represented active source kinds and retains the stored timezone day across runtime offset changes', async () => {
    const offset = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValueOnce(300);
    const item = homework('zone', Date.UTC(2026, 5, 30, 2)); await service.prepareHomeworkCompletionDelivery(item); offset.mockRestore();
    const stored = JSON.parse(raw!).entries[0]; expect(stored.source).toMatchObject({ timezoneOffsetMinutes: 300, completionDay: '2026-06-29' });
    const changedOffset = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-300);
    const localYear = vi.spyOn(Date.prototype, 'getFullYear').mockImplementation(() => 1999);
    const localMonth = vi.spyOn(Date.prototype, 'getMonth').mockImplementation(() => 11);
    const localDate = vi.spyOn(Date.prototype, 'getDate').mockImplementation(() => 31);
    homeworkRead.mockResolvedValue([item]); await expect(service.getRecoverableCompletionDeliveries()).resolves.toHaveLength(1); changedOffset.mockRestore();
    localYear.mockRestore(); localMonth.mockRestore(); localDate.mockRestore();
    expect(focusRead).not.toHaveBeenCalled();
    raw = null; await service.prepareFocusCompletionDelivery(focus('only-focus')); focusRead.mockResolvedValue([focus('only-focus')]); homeworkRead.mockClear();
    await service.getRecoverableCompletionDeliveries(); expect(homeworkRead).not.toHaveBeenCalled();
  });

  it('rejects Focus durations over 1440 or not matching persisted start/end before journal writes', async () => {
    await expect(service.prepareFocusCompletionDelivery({ ...focus(), duration: 1441, endTime: 86_461_000 })).rejects.toThrow();
    await expect(service.prepareFocusCompletionDelivery({ ...focus(), endTime: 60_000 })).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });

  it('prunes only the oldest closed entry at capacity and rejects a full unresolved journal', async () => {
    const item = homework('seed'); await service.prepareHomeworkCompletionDelivery(item); homeworkRead.mockResolvedValue([item]); await service.getRecoverableCompletionDeliveries(); await service.markCompletionDeliveryLegSettled('completion-delivery:homework:seed', 'token'); await service.markCompletionDeliveryLegSettled('completion-delivery:homework:seed', 'achievement');
    const closed = JSON.parse(raw!).entries[0];
    raw = JSON.stringify({ version: 1, entries: [closed, ...Array.from({ length: 499 }, (_, i) => ({ ...closed, deliveryId: `completion-delivery:homework:p${i}`, source: { ...closed.source, id: `p${i}` }, sourceState: 'prepared', token: { ...closed.token, operationId: `homework-complete:p${i}`, state: 'pending' }, achievement: { ...closed.achievement, eventId: `homework-completed:p${i}`, state: 'pending' } }))] });
    await service.prepareHomeworkCompletionDelivery(homework('new'));
    expect(JSON.parse(raw!).entries).toHaveLength(500); expect(JSON.parse(raw!).entries[0].deliveryId).toBe('completion-delivery:homework:p0');
    const unresolved = JSON.parse(raw!).entries.map((e: object) => ({ ...e, sourceState: 'prepared', token: { ...(e as { token: object }).token, state: 'pending' }, achievement: { ...(e as { achievement: object }).achievement, state: 'pending' } })); raw = JSON.stringify({ version: 1, entries: unresolved }); const before = raw;
    await expect(service.prepareHomeworkCompletionDelivery(homework('overflow'))).rejects.toThrow('safe limit'); expect(raw).toBe(before);
  });
});
