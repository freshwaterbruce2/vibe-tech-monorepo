import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { error, warn } = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));

vi.mock('../../utils/logger', () => ({
  logger: { error, warn },
}));

interface MetadataInit {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: Array<{ src: string; sizes?: string; type?: string }>;
}

class TestMediaMetadata {
  public readonly init: MetadataInit;

  constructor(init: MetadataInit) {
    this.init = init;
  }
}

const baseTrack = {
  id: 'track-1',
  name: 'Focus Flow',
  downloadUrl: 'https://example.invalid/focus-flow.mp3',
  downloadStatus: 'completed' as const,
  createdAt: 1,
};

describe('mediaSession metadata', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('MediaMetadata', TestMediaMetadata);
    error.mockReset();
    warn.mockReset();
  });

  afterEach(() => {
    delete (navigator as Navigator & { mediaSession?: unknown }).mediaSession;
    vi.unstubAllGlobals();
  });

  async function loadWithMediaSession(mediaSession: { metadata: unknown }): Promise<typeof import('../mediaSessionService')> {
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: mediaSession,
    });
    return import('../mediaSessionService');
  }

  it('keeps supplied album art exact without inventing MIME type or dimensions', async () => {
    const session = { metadata: null as unknown };
    const { mediaSession } = await loadWithMediaSession(session);

    mediaSession.updateMetadata({ ...baseTrack, albumArt: 'data:image/webp;base64,known-by-source' });

    expect((session.metadata as TestMediaMetadata).init).toMatchObject({
      title: 'Focus Flow',
      artist: 'Unknown Artist',
      album: 'Vibe-Tutor Music',
      artwork: [{ src: 'data:image/webp;base64,known-by-source' }],
    });
    expect((session.metadata as TestMediaMetadata).init.artwork).not.toContainEqual(
      expect.objectContaining({ sizes: expect.any(String) }),
    );
    expect((session.metadata as TestMediaMetadata).init.artwork).not.toContainEqual(
      expect.objectContaining({ type: expect.any(String) }),
    );
  });

  it('uses only exact final icon metadata when album art is absent or blank', async () => {
    const session = { metadata: null as unknown };
    const { mediaSession } = await loadWithMediaSession(session);

    mediaSession.updateMetadata(baseTrack);
    expect((session.metadata as TestMediaMetadata).init.artwork).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]);

    mediaSession.updateMetadata({ ...baseTrack, albumArt: '   ' });
    expect((session.metadata as TestMediaMetadata).init.artwork).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]);
    expect(JSON.stringify(session.metadata)).not.toContain('/vite.svg');
  });

  it('does nothing when the Media Session API is unsupported', async () => {
    const { mediaSession } = await import('../mediaSessionService');

    mediaSession.updateMetadata(baseTrack);

    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('contains MediaMetadata construction failures with an error log', async () => {
    const session = { metadata: null as unknown };
    const { mediaSession } = await loadWithMediaSession(session);
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor() {
          throw new Error('metadata constructor unavailable');
        }
      },
    );

    mediaSession.updateMetadata(baseTrack);

    expect(error).toHaveBeenCalledWith(
      '❌ Failed to update Media Session metadata:',
      expect.any(Error),
    );
    expect(session.metadata).toBeNull();
  });

  it('contains media-session assignment failures with an error log', async () => {
    const session = {
      set metadata(_value: unknown) {
        throw new Error('metadata assignment unavailable');
      },
    };
    const { mediaSession } = await loadWithMediaSession(session);

    mediaSession.updateMetadata(baseTrack);

    expect(error).toHaveBeenCalledWith(
      '❌ Failed to update Media Session metadata:',
      expect.any(Error),
    );
  });
});
