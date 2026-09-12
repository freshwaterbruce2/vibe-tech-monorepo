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

    const result = await breakDownTask('Write an essay', 'English');

    expect(secure.createChatCompletion).toHaveBeenCalledWith(
      expect.any(Array),
      { chatType: 'tutor' },
    );
    expect(result).toEqual({ status: 'success', steps: ['read', 'write'] });
  });

  it('returns an unavailable result when the AI response is malformed', async () => {
    secure.createChatCompletion.mockResolvedValue(JSON.stringify({ steps: ['read', 2] }));

    const result = await breakDownTask('Solve problems', 'Math');

    expect(result).toEqual({
      status: 'unavailable',
      message: 'AI-generated steps are unavailable right now. Please try again.',
    });
    expect(store.sessionStore.set).not.toHaveBeenCalled();
  });

  it('returns an unavailable result when generation fails', async () => {
    secure.createChatCompletion.mockRejectedValue(new Error('provider unavailable'));

    const result = await breakDownTask('Solve problems', 'Math');

    expect(result).toEqual({
      status: 'unavailable',
      message: 'AI-generated steps are unavailable right now. Please try again.',
    });
  });
});
