import { beforeEach, describe, expect, it, vi } from 'vitest';

const createChatCompletion = vi.fn();

vi.mock('../secureClient', () => ({ createChatCompletion }));

const { generateScheduleSuggestion } = await import('../openrouter');

const context = { peakHours: [16, 17], energyLevel: 2 as const, homeworkTitles: ['Math'] };
const validItem = { time: ' 4:00 pm ', activity: ' Math homework ', durationMinutes: 30, type: ' study ' };

describe('generateScheduleSuggestion', () => {
  beforeEach(() => {
    createChatCompletion.mockReset();
  });

  it('returns only a nonempty fully validated schedule array', async () => {
    createChatCompletion.mockResolvedValue(JSON.stringify([validItem]));

    await expect(generateScheduleSuggestion(context)).resolves.toEqual([
      { time: '4:00 PM', activity: 'Math homework', durationMinutes: 30, type: 'study' },
    ]);
    expect(createChatCompletion).toHaveBeenCalledWith(expect.any(Array), { chatType: 'tutor' });
  });

  it('rejects provider failures', async () => {
    createChatCompletion.mockRejectedValue(new Error('provider unavailable'));

    await expect(generateScheduleSuggestion(context)).rejects.toThrow('provider unavailable');
  });

  it.each([
    ['a missing array', 'not a schedule'],
    ['an empty array', '[]'],
    ['malformed JSON', '[{bad}]'],
    ['a blank time', JSON.stringify([{ ...validItem, time: ' ' }])],
    ['a blank activity', JSON.stringify([{ ...validItem, activity: '' }])],
    ['a blank type', JSON.stringify([{ ...validItem, type: ' ' }])],
    ['a non-time value', JSON.stringify([{ ...validItem, time: 'someday' }])],
    ['an hour outside 1-12', JSON.stringify([{ ...validItem, time: '13:00 PM' }])],
    ['an invalid minute', JSON.stringify([{ ...validItem, time: '4:60 PM' }])],
    ['a zero duration', JSON.stringify([{ ...validItem, durationMinutes: 0 }])],
    ['a fractional duration', JSON.stringify([{ ...validItem, durationMinutes: 30.5 }])],
    ['an excessive duration', JSON.stringify([{ ...validItem, durationMinutes: 721 }])],
    ['a string duration', JSON.stringify([{ ...validItem, durationMinutes: '30' }])],
  ])('rejects %s', async (_caseName, content) => {
    createChatCompletion.mockResolvedValue(content);

    await expect(generateScheduleSuggestion(context)).rejects.toThrow();
  });
});
