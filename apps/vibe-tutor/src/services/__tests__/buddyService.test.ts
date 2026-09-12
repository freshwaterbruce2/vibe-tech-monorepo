import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../secureClient', () => ({ createChatCompletion: vi.fn() }));
vi.mock('../safetyClassifier', () => ({ classifyMessageSafety: vi.fn().mockResolvedValue(null) }));
vi.mock('../usageMonitor', () => ({ usageMonitor: { reserveRequest: vi.fn(() => ({ allowed: true, reservationId: 'buddy-1' })), commitRequest: vi.fn().mockResolvedValue(true), releaseRequest: vi.fn() } }));
vi.mock('../learningAnalytics', () => ({ learningAnalytics: { logAICall: vi.fn() } }));
import { createChatCompletion } from '../secureClient';
import { learningAnalytics } from '../learningAnalytics';
import { classifyMessageSafety } from '../safetyClassifier';
import { clearBuddyHistory, hydrateBuddyHistory, sendMessageToBuddy } from '../buddyService';
import { clearTutorHistory, hydrateTutorHistory } from '../tutorService';
import { usageMonitor } from '../usageMonitor';
describe('Buddy service boundary', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  clearBuddyHistory();
  clearTutorHistory();
  vi.mocked(createChatCompletion).mockResolvedValue('That sounds frustrating. Want to talk it through?');
  vi.mocked(classifyMessageSafety).mockResolvedValue(null);
  vi.mocked(usageMonitor.reserveRequest).mockReturnValue({ allowed: true, reservationId: 'buddy-1' });
 });

 it('sends only Buddy context under friend chat type and commits a real response once', async () => {
  await expect(sendMessageToBuddy('My game was rough')).resolves.toBe('That sounds frustrating. Want to talk it through?');
  const [messages, options] = vi.mocked(createChatCompletion).mock.calls[0]!;
  expect(messages[0]).toEqual({ role: 'user', content: 'My game was rough' });
  expect(messages.every((message) => message.role !== 'system')).toBe(true);
  expect(options).toEqual({ chatType: 'friend' });
  expect(usageMonitor.commitRequest).toHaveBeenCalledWith('buddy-1');
 expect(learningAnalytics.logAICall).toHaveBeenCalledTimes(1);
 });

 it('returns a real reply without releasing capacity when its commit cannot persist', async () => {
  vi.mocked(usageMonitor.commitRequest).mockResolvedValueOnce(false);
  await expect(sendMessageToBuddy('A thought')).resolves.toBe('That sounds frustrating. Want to talk it through?');
  expect(usageMonitor.releaseRequest).not.toHaveBeenCalled();
 });

 it('keeps hydrated Buddy context distinct from Tutor context', async () => {
  hydrateTutorHistory([{ role: 'user', content: 'Tutor-only question', timestamp: 1 }]);
  hydrateBuddyHistory([{ role: 'user', content: 'Gaming issue', timestamp: 1 }]);
  await sendMessageToBuddy('What should I say?');
  const messages = vi.mocked(createChatCompletion).mock.calls[0]![0];
  expect(messages).toEqual([{ role: 'user', content: 'Gaming issue' }, { role: 'user', content: 'What should I say?' }]);
 });

 it('rejects provider failures without charging or retaining the failed turn', async () => {
  vi.mocked(createChatCompletion).mockRejectedValueOnce(new Error('network unavailable'));
  await expect(sendMessageToBuddy('Failed thought')).rejects.toThrow('network unavailable');
  expect(usageMonitor.releaseRequest).toHaveBeenCalledWith('buddy-1');
  expect(learningAnalytics.logAICall).not.toHaveBeenCalled();

  await sendMessageToBuddy('Working thought');
  expect(vi.mocked(createChatCompletion).mock.calls[1]![0]).toEqual([{ role: 'user', content: 'Working thought' }]);
  expect(usageMonitor.commitRequest).toHaveBeenCalledTimes(1);
 });

 it('uses classifier crisis support when the concurrent provider request fails', async () => {
  vi.mocked(classifyMessageSafety).mockResolvedValueOnce('self-harm');
  vi.mocked(createChatCompletion).mockRejectedValueOnce(new Error('provider unavailable'));
  await expect(sendMessageToBuddy('I feel unsafe')).resolves.toMatch(/trusted adult/i);
  expect(usageMonitor.releaseRequest).toHaveBeenCalledWith('buddy-1');
  expect(learningAnalytics.logAICall).not.toHaveBeenCalled();
 });

 it('uses local crisis support without provider generation', async () => {
  const reply = await sendMessageToBuddy('I want to kill myself');
  expect(reply).toMatch(/trusted adult/i);
  expect(createChatCompletion).not.toHaveBeenCalled();
 });

 it('returns the honest usage-limit reason when no safety flag is present', async () => {
  vi.mocked(usageMonitor.reserveRequest).mockReturnValue({ allowed: false, reason: 'Daily limit reached.' });
  await expect(sendMessageToBuddy('One more thought')).resolves.toBe('Daily limit reached.');
  expect(createChatCompletion).not.toHaveBeenCalled();
  expect(usageMonitor.commitRequest).not.toHaveBeenCalled();
 });
});
