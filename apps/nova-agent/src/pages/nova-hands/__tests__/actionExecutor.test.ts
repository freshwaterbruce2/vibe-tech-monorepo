import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAction } from '../actionExecutor';
import type { AgentAction } from '../types';

vi.mock('@/services/computerUseService', () => ({
  ComputerUseService: {
    simulateMouseAction: vi.fn().mockResolvedValue(undefined),
    simulateKeyboardAction: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('executeAction', () => {
  const thought = 'Perform the action.';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a mouse HistoryItem with correct type, detail, thought, and timestamp', async () => {
    const action: AgentAction = { type: 'mouse', action: 'click', x: 100, y: 200 };
    const item = await executeAction(action, { currentThought: thought });

    expect(item).not.toBeNull();
    expect(item?.type).toBe('mouse');
    expect(item?.detail).toBe('click at (100, 200)');
    expect(item?.thought).toBe(thought);
    expect(typeof item?.timestamp).toBe('string');
  });

  it('handles keyboard "type" action', async () => {
    const action: AgentAction = { type: 'keyboard', action: 'type', text: 'hello world' };
    const item = await executeAction(action, { currentThought: thought });

    expect(item?.type).toBe('keyboard');
    expect(item?.detail).toBe('type "hello world"');
    expect(item?.thought).toBe(thought);
  });

  it('handles keyboard "press_key" action', async () => {
    const action: AgentAction = { type: 'keyboard', action: 'press_key', key: 'enter' };
    const item = await executeAction(action, { currentThought: thought });

    expect(item?.type).toBe('keyboard');
    expect(item?.detail).toContain('enter');
    expect(item?.thought).toBe(thought);
  });

  it('returns null for "done" action', async () => {
    const action: AgentAction = { type: 'done' };
    const item = await executeAction(action, { currentThought: thought });
    expect(item).toBeNull();
  });
});
