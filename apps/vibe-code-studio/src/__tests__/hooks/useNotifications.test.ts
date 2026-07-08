import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useNotifications } from '../../hooks/useNotifications';

const ID_RE = /^notification-[0-9a-f-]{36}$/;

describe('useNotifications', () => {
  it('addNotification generates a crypto.randomUUID-based id and appends the item', () => {
    const { result } = renderHook(() => useNotifications());

    let id = '';
    act(() => {
      id = result.current.addNotification('success', 'Saved', 'File written', 2000);
    });

    expect(id).toMatch(ID_RE);
    expect(result.current.notifications).toEqual([
      { id, type: 'success', title: 'Saved', message: 'File written', duration: 2000 },
    ]);
  });

  it('generates unique ids and preserves insertion order', () => {
    const { result } = renderHook(() => useNotifications());

    let first = '';
    let second = '';
    act(() => {
      first = result.current.addNotification('info', 'First');
    });
    act(() => {
      second = result.current.addNotification('warning', 'Second');
    });

    expect(first).toMatch(ID_RE);
    expect(second).toMatch(ID_RE);
    expect(first).not.toBe(second);
    expect(result.current.notifications.map(n => n.title)).toEqual(['First', 'Second']);
  });

  it('removeNotification removes only the matching notification', () => {
    const { result } = renderHook(() => useNotifications());

    let keep = '';
    let drop = '';
    act(() => {
      keep = result.current.addNotification('info', 'Keep me');
      drop = result.current.addNotification('error', 'Drop me');
    });
    act(() => {
      result.current.removeNotification(drop);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]!.id).toBe(keep);
    expect(result.current.notifications[0]!.title).toBe('Keep me');
  });

  it('removeNotification with an unknown id is a no-op', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('info', 'Still here');
    });
    act(() => {
      result.current.removeNotification('notification-does-not-exist');
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('show helpers set type, default durations, and errors stay longer', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showSuccess('ok', 'done');
      result.current.showError('bad', 'broke');
      result.current.showWarning('careful');
      result.current.showInfo('fyi');
    });

    const byTitle = (title: string) => result.current.notifications.find(n => n.title === title)!;
    expect(byTitle('ok')).toMatchObject({ type: 'success', duration: 5000, message: 'done' });
    expect(byTitle('bad')).toMatchObject({ type: 'error', duration: 8000, message: 'broke' });
    expect(byTitle('careful')).toMatchObject({ type: 'warning', duration: 5000 });
    expect(byTitle('fyi')).toMatchObject({ type: 'info', duration: 5000 });
    result.current.notifications.forEach(n => expect(n.id).toMatch(ID_RE));
  });
});
