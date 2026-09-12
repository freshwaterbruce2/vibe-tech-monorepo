import { describe, expect, it, vi } from 'vitest';

const { getPlatform, isNativePlatform } = vi.hoisted(() => ({
  getPlatform: vi.fn(() => 'web'),
  isNativePlatform: vi.fn(() => false),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform, isNativePlatform },
}));
vi.mock('@/config', () => ({
  TUTOR_CONFIG: {
    apiEndpoint: 'https://vibe-tutor-api-734857480460.us-east4.run.app',
  },
}));
vi.mock('../../utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

import { audioStream } from '../audioStreamService';

const getProxiedUrl = (url: string): string =>
  (audioStream as unknown as { getProxiedUrl(streamUrl: string): string }).getProxiedUrl(url);

describe('audioStreamService endpoint boundary', () => {
  it('uses the sanitized Android endpoint despite a hostile raw runtime override', () => {
    window.__API_URL__ = 'https://hostile.example';
    vi.mocked(getPlatform).mockReturnValue('android');

    expect(getProxiedUrl('https://radio.example/live?genre=lo-fi&region=us')).toBe(
      'https://vibe-tutor-api-734857480460.us-east4.run.app/api/radio/stream?url=https%3A%2F%2Fradio.example%2Flive%3Fgenre%3Dlo-fi%26region%3Dus',
    );
  });

  it('keeps web HTML5 playback on the direct station URL', () => {
    vi.mocked(getPlatform).mockReturnValue('web');
    const directUrl = 'https://radio.example/live?genre=lo-fi&region=us';

    expect(getProxiedUrl(directUrl)).toBe(directUrl);
  });
});
