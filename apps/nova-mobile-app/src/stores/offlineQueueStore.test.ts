import { useOfflineQueueStore } from './offlineQueueStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('offlineQueueStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOfflineQueueStore.setState({
      queue: [],
    });
  });

  it('should initialize with an empty queue', () => {
    expect(useOfflineQueueStore.getState().queue).toEqual([]);
  });

  it('should enqueue messages', () => {
    const msg1 = { id: '1', content: 'hello', timestamp: '2026-06-01T12:00:00Z' };
    const msg2 = { id: '2', content: 'world', timestamp: '2026-06-01T12:01:00Z' };

    useOfflineQueueStore.getState().enqueue(msg1);
    expect(useOfflineQueueStore.getState().queue).toEqual([msg1]);

    useOfflineQueueStore.getState().enqueue(msg2);
    expect(useOfflineQueueStore.getState().queue).toEqual([msg1, msg2]);
  });

  it('should dequeue messages by ID', () => {
    const msg1 = { id: '1', content: 'hello', timestamp: '2026-06-01T12:00:00Z' };
    const msg2 = { id: '2', content: 'world', timestamp: '2026-06-01T12:01:00Z' };

    useOfflineQueueStore.setState({ queue: [msg1, msg2] });

    useOfflineQueueStore.getState().dequeue('1');
    expect(useOfflineQueueStore.getState().queue).toEqual([msg2]);

    useOfflineQueueStore.getState().dequeue('non-existent');
    expect(useOfflineQueueStore.getState().queue).toEqual([msg2]);

    useOfflineQueueStore.getState().dequeue('2');
    expect(useOfflineQueueStore.getState().queue).toEqual([]);
  });

  it('should clear the entire queue', () => {
    const msg1 = { id: '1', content: 'hello', timestamp: '2026-06-01T12:00:00Z' };
    const msg2 = { id: '2', content: 'world', timestamp: '2026-06-01T12:01:00Z' };

    useOfflineQueueStore.setState({ queue: [msg1, msg2] });

    useOfflineQueueStore.getState().clearQueue();
    expect(useOfflineQueueStore.getState().queue).toEqual([]);
  });
});
