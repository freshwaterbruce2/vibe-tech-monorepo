import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../secureClient', () => ({ secureClient: { classifySafety: vi.fn() } }));
import { secureClient } from '../secureClient';
import { classifyMessageSafety } from '../safetyClassifier';

describe('safetyClassifier', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not classify empty or ordinary messages a second time', async () => {
    expect(await classifyMessageSafety('')).toBeNull();
    expect(await classifyMessageSafety('Can you help me with fractions?', 'tutor')).toBeNull();
    expect(secureClient.classifySafety).not.toHaveBeenCalled();
  });
  it('uses the backend-owned classifier only for ambiguous messages', async () => {
    vi.mocked(secureClient.classifySafety).mockResolvedValue('self-harm');
    expect(await classifyMessageSafety('I want to disappear', 'friend')).toBe('self-harm');
    expect(secureClient.classifySafety).toHaveBeenCalledWith('I want to disappear');
  });
  it('fails open for an unavailable or invalid backend verdict', async () => {
    vi.mocked(secureClient.classifySafety).mockResolvedValue('unknown');
    expect(await classifyMessageSafety("I'm afraid when dad gets home")).toBeNull();
    vi.mocked(secureClient.classifySafety).mockRejectedValue(new Error('offline'));
    expect(await classifyMessageSafety('I want to disappear')).toBeNull();
  });
});
