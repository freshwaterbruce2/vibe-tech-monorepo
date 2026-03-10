import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from '../useNotifications';

// Mock the NotificationContext
const mockContext = {
  notifications: [],
  error: vi.fn().mockReturnValue('err-id'),
  warning: vi.fn().mockReturnValue('warn-id'),
  success: vi.fn().mockReturnValue('suc-id'),
  info: vi.fn().mockReturnValue('info-id'),
  addNotification: vi.fn().mockReturnValue('custom-id'),
  removeNotification: vi.fn(),
  clearAll: vi.fn(),
};

vi.mock('../../contexts/NotificationContext', () => ({
  useNotificationContext: () => mockContext,
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all notification methods', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.error).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.success).toBeDefined();
    expect(result.current.info).toBeDefined();
    expect(result.current.addNotification).toBeDefined();
    expect(result.current.removeNotification).toBeDefined();
    expect(result.current.clearAll).toBeDefined();
    expect(result.current.notifications).toBeDefined();
  });

  it('should show an error notification', () => {
    const { result } = renderHook(() => useNotifications());

    const id = result.current.error('Error Title', 'Something broke');

    expect(mockContext.error).toHaveBeenCalledWith('Error Title', 'Something broke', undefined);
    expect(id).toBe('err-id');
  });

  it('should show a warning notification', () => {
    const { result } = renderHook(() => useNotifications());

    const id = result.current.warning('Warning', 'Be careful');

    expect(mockContext.warning).toHaveBeenCalledWith('Warning', 'Be careful', undefined);
    expect(id).toBe('warn-id');
  });

  it('should show a success notification', () => {
    const { result } = renderHook(() => useNotifications());

    const id = result.current.success('Done', 'Saved!', 3000);

    expect(mockContext.success).toHaveBeenCalledWith('Done', 'Saved!', 3000);
    expect(id).toBe('suc-id');
  });

  it('should show an info notification', () => {
    const { result } = renderHook(() => useNotifications());

    const id = result.current.info('FYI', 'Something happened');

    expect(mockContext.info).toHaveBeenCalledWith('FYI', 'Something happened', undefined);
    expect(id).toBe('info-id');
  });

  it('should show a notification with custom config', () => {
    const { result } = renderHook(() => useNotifications());
    const config = { type: 'error' as const, title: 'Custom', message: 'Detail', duration: 0 };

    const id = result.current.addNotification(config);

    expect(mockContext.addNotification).toHaveBeenCalledWith(config);
    expect(id).toBe('custom-id');
  });

  it('should remove a notification by id', () => {
    const { result } = renderHook(() => useNotifications());

    result.current.removeNotification('some-id');

    expect(mockContext.removeNotification).toHaveBeenCalledWith('some-id');
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotifications());

    result.current.clearAll();

    expect(mockContext.clearAll).toHaveBeenCalled();
  });

  it('should pass through error with custom duration (0 = no auto-dismiss)', () => {
    const { result } = renderHook(() => useNotifications());

    result.current.error('Critical', 'Check logs', 0);

    expect(mockContext.error).toHaveBeenCalledWith('Critical', 'Check logs', 0);
  });
});
