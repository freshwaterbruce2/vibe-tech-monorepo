import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({ createChatCompletion: vi.fn() }));
vi.mock('../secureClient', () => secure);

const analytics = vi.hoisted(() => ({ learningAnalytics: { logAICall: vi.fn() } }));
vi.mock('../learningAnalytics', () => analytics);

import { parseHomeworkFromVoice } from '../homeworkParserService';

describe('homeworkParserService.parseHomeworkFromVoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests the primary model and parses the homework JSON', async () => {
    secure.createChatCompletion.mockResolvedValue(
      JSON.stringify({ subject: 'math', title: '10 problems', dueDate: '2026-07-05' }),
    );

    const result = await parseHomeworkFromVoice('math 10 problems due friday');

    expect(secure.createChatCompletion).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: 'deepseek/deepseek-v3.2' }),
    );
    expect(result).toEqual({ subject: 'math', title: '10 problems', dueDate: '2026-07-05' });
  });

  it('returns null when the AI response is empty', async () => {
    secure.createChatCompletion.mockResolvedValue(null);

    const result = await parseHomeworkFromVoice('unintelligible');
    expect(result).toBeNull();
  });
});
