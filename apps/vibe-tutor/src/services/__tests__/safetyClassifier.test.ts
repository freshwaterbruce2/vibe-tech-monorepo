import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as secureClient from '../secureClient';
import { classifyMessageSafety, SAFETY_CLASSIFIER_MODEL } from '../safetyClassifier';

// The classifier reuses the existing proxy client; mock it so we drive the
// model's raw output directly and assert the parse/threshold/fail-open logic.
vi.mock('../secureClient', () => ({
  createChatCompletion: vi.fn(),
}));

describe('safetyClassifier.classifyMessageSafety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for empty / whitespace input without calling the model', async () => {
    expect(await classifyMessageSafety('')).toBeNull();
    expect(await classifyMessageSafety('   ')).toBeNull();
    expect(secureClient.createChatCompletion).not.toHaveBeenCalled();
  });

  it('flags self-harm from strict JSON', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":"self-harm"}');
    expect(await classifyMessageSafety('i already wrote the note, just havent decided when')).toBe(
      'self-harm',
    );
  });

  it('flags abuse from strict JSON', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":"abuse"}');
    expect(await classifyMessageSafety('he puts his hands under my clothes')).toBe('abuse');
  });

  it('returns null for category "none"', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":"none"}');
    expect(await classifyMessageSafety('can you help me with fractions?')).toBeNull();
  });

  it('tolerates surrounding text / code fences around the JSON', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue(
      'Here is the result:\n```json\n{"category":"self-harm"}\n```\nDone.',
    );
    expect(await classifyMessageSafety('indirect disclosure')).toBe('self-harm');
  });

  it('is case-insensitive on the category value', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":"ABUSE"}');
    expect(await classifyMessageSafety('x')).toBe('abuse');
  });

  it('fails open (null) on non-JSON output', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue("I couldn't classify that");
    expect(await classifyMessageSafety('x')).toBeNull();
  });

  it('fails open (null) on an unknown category string', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":"spam"}');
    expect(await classifyMessageSafety('x')).toBeNull();
  });

  it('fails open (null) when category is not a string', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":123}');
    expect(await classifyMessageSafety('x')).toBeNull();
  });

  it('fails open (null) when the client returns null', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);
    expect(await classifyMessageSafety('x')).toBeNull();
  });

  it('fails open (null) when the client throws', async () => {
    vi.mocked(secureClient.createChatCompletion).mockRejectedValue(new Error('network down'));
    expect(await classifyMessageSafety('x')).toBeNull();
  });

  it('calls the classifier model at temperature 0 with the raw child message', async () => {
    vi.mocked(secureClient.createChatCompletion).mockResolvedValue('{"category":"none"}');

    await classifyMessageSafety('hello there');

    expect(secureClient.createChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'hello there' }),
      ]),
      expect.objectContaining({ model: SAFETY_CLASSIFIER_MODEL, temperature: 0 }),
    );
  });

  it('pins the classifier model constant to deepseek-v3.2', () => {
    expect(SAFETY_CLASSIFIER_MODEL).toBe('deepseek/deepseek-v3.2');
  });
});
