import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({ createChatCompletion: vi.fn() }));
vi.mock('../secureClient', () => secure);

import { generateProgressReport } from '../reportGeneratorService';

describe('reportGeneratorService.generateProgressReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests the primary model and returns the report text', async () => {
    secure.createChatCompletion.mockResolvedValue('Great progress this week!');

    const report = await generateProgressReport([], 3, 120, {
      Math: { total: 5, completed: 4 },
    });

    expect(secure.createChatCompletion).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: 'deepseek/deepseek-v3.2' }),
    );
    expect(report).toBe('Great progress this week!');
  });

  it('returns a fallback message when generation fails', async () => {
    secure.createChatCompletion.mockRejectedValue(new Error('network down'));

    const report = await generateProgressReport([], 0, 0, {});
    expect(report).toMatch(/could not generate a report/i);
  });
});
