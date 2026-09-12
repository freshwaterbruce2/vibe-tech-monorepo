import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../secureClient', () => ({ createChatCompletion: vi.fn() }));
vi.mock('../safetyClassifier', () => ({ classifyMessageSafety: vi.fn().mockResolvedValue(null) }));
vi.mock('../usageMonitor', () => ({ usageMonitor: { reserveRequest: vi.fn(() => ({ allowed: true, reservationId: 'tutor-1' })), commitRequest: vi.fn().mockResolvedValue(true), releaseRequest: vi.fn() } }));
vi.mock('../learningAnalytics', () => ({ learningAnalytics: { logAICall: vi.fn() } }));
import { createChatCompletion } from '../secureClient';
import { learningAnalytics } from '../learningAnalytics';
import { classifyMessageSafety } from '../safetyClassifier';
import { clearTutorHistory, hydrateTutorHistory, sendMessageToTutor } from '../tutorService';
import { usageMonitor } from '../usageMonitor';
describe('Tutor service boundary', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  clearTutorHistory();
  vi.mocked(createChatCompletion).mockResolvedValue('Try grouping the fractions first.');
  vi.mocked(classifyMessageSafety).mockResolvedValue(null);
  vi.mocked(usageMonitor.reserveRequest).mockReturnValue({ allowed: true, reservationId: 'tutor-1' });
 });

 it('sends only user/assistant context under tutor chat type and commits a real response once', async () => {
  await expect(sendMessageToTutor('Help me with fractions')).resolves.toBe('Try grouping the fractions first.');
  expect(createChatCompletion).toHaveBeenCalledWith([{ role: 'user', content: 'Help me with fractions' }], { chatType: 'tutor' });
  expect(usageMonitor.commitRequest).toHaveBeenCalledWith('tutor-1');
  expect(learningAnalytics.logAICall).toHaveBeenCalledTimes(1);
 });

 it('releases a reservation when a synchronous client setup error prevents a response', async () => {
  vi.mocked(createChatCompletion).mockImplementationOnce(() => { throw new Error('local setup failed'); });
  await expect(sendMessageToTutor('A question')).rejects.toThrow('local setup failed');
  expect(usageMonitor.releaseRequest).toHaveBeenCalledWith('tutor-1');
 });

 it('returns a real reply without releasing capacity when its commit cannot persist', async () => {
  vi.mocked(usageMonitor.commitRequest).mockResolvedValueOnce(false);
  await expect(sendMessageToTutor('A question')).resolves.toBe('Try grouping the fractions first.');
  expect(usageMonitor.releaseRequest).not.toHaveBeenCalled();
 });

 it('hydrates only supplied Tutor history and does not inject a system prompt', async () => {
  hydrateTutorHistory([{ role: 'user', content: 'Earlier question', timestamp: 1 }]);
  await sendMessageToTutor('Next question');
  const messages = vi.mocked(createChatCompletion).mock.calls[0]![0];
  expect(messages).toEqual([{ role: 'user', content: 'Earlier question' }, { role: 'user', content: 'Next question' }]);
 });

 it('rejects provider failures without charging or retaining the failed turn', async () => {
  vi.mocked(createChatCompletion).mockRejectedValueOnce(new Error('network unavailable'));
  await expect(sendMessageToTutor('Failed question')).rejects.toThrow('network unavailable');
  expect(usageMonitor.releaseRequest).toHaveBeenCalledWith('tutor-1');
  expect(learningAnalytics.logAICall).not.toHaveBeenCalled();

  await sendMessageToTutor('Working question');
  expect(vi.mocked(createChatCompletion).mock.calls[1]![0]).toEqual([{ role: 'user', content: 'Working question' }]);
  expect(usageMonitor.commitRequest).toHaveBeenCalledTimes(1);
 });

 it('uses classifier crisis support when the concurrent provider request fails', async () => {
  vi.mocked(classifyMessageSafety).mockResolvedValueOnce('self-harm');
  vi.mocked(createChatCompletion).mockRejectedValueOnce(new Error('provider unavailable'));
  await expect(sendMessageToTutor('I feel unsafe')).resolves.toMatch(/trusted adult/i);
  expect(usageMonitor.releaseRequest).toHaveBeenCalledWith('tutor-1');
  expect(learningAnalytics.logAICall).not.toHaveBeenCalled();
 });

 it('returns fixed crisis support without provider generation', async () => {
  const reply = await sendMessageToTutor('I want to kill myself');
  expect(reply).toMatch(/trusted adult/i);
  expect(createChatCompletion).not.toHaveBeenCalled();
 });

 it('returns the honest usage-limit reason when no safety flag is present', async () => {
  vi.mocked(usageMonitor.reserveRequest).mockReturnValue({ allowed: false, reason: 'Daily limit reached.' });
  await expect(sendMessageToTutor('One more question')).resolves.toBe('Daily limit reached.');
  expect(createChatCompletion).not.toHaveBeenCalled();
  expect(usageMonitor.commitRequest).not.toHaveBeenCalled();
 });
});
