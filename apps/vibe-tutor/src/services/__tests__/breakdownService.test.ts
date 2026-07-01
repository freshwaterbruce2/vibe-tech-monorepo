import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({ createChatCompletion: vi.fn() }));
vi.mock('../secureClient', () => secure);

const store = vi.hoisted(() => ({
  sessionStore: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../utils/electronStore', () => store);

import { breakDownTask } from '../breakdownService';

describe('breakdownService.breakDownTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.sessionStore.get.mockReturnValue(null);
  });

  it('requests the primary model and returns parsed steps', async () => {
    secure.createChatCompletion.mockResolvedValue(JSON.stringify({ steps: ['read', 'write'] }));

    const steps = await breakDownTask('Write an essay', 'English');

    expect(secure.createChatCompletion).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: 'deepseek/deepseek-v3.2' }),
    );
    expect(steps).toEqual(['read', 'write']);
  });

  it('returns fallback steps when the AI response is empty', async () => {
    secure.createChatCompletion.mockResolvedValue(null);

    const steps = await breakDownTask('Solve problems', 'Math');
    expect(steps.length).toBeGreaterThan(0);
  });
});
