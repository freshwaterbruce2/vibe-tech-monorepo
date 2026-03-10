/**
 * Music Service - Handle Spotify and YouTube playlist embeds
 * No authentication required, uses public embed URLs
 */

export type MusicPlatform = 'spotify' | 'youtube' | 'unknown';

/**
 * Detect the music platform from a URL
 */
export const detectPlatform = (url: string): MusicPlatform => {
  const normalizedUrl = url.toLowerCase().trim();

  if (normalizedUrl.includes('spotify.com')) {
    return 'spotify';
  }

  if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
    return 'youtube';
  }

  return 'unknown';
};

/**
 * Extract Spotify playlist/album/track ID from URL
 * Supports formats:
 * - https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd
 * - spotify:playlist:37i9dQZF1DX0XUsuxWHRQd
 */
const extractSpotifyId = (url: string): { type: string; id: string } | null => {
  // Web URL format
  const webMatch = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (webMatch) {
    return { type: webMatch[1]!, id: webMatch[2]! };
  }

  // URI format (spotify:playlist:id)
  const uriMatch = url.match(/spotify:(playlist|album|track):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return { type: uriMatch[1]!, id: uriMatch[2]! };
  }

  return null;
};

/**
 * Generate Spotify embed iframe code
 */
export const generateSpotifyEmbed = (url: string): string | null => {
  const spotifyData = extractSpotifyId(url);

  if (!spotifyData) {
    return null;
  }

  const embedUrl = `https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}`;

  return `<iframe
    style="border-radius:12px"
    src="${embedUrl}?utm_source=generator"
    width="100%"
    height="352"
    frameBorder="0"
    allowfullscreen=""
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy">
  </iframe>`;
};

/**
 * Extract YouTube video or playlist ID from URL
 * Supports formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/playlist?list=PLAYLIST_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 */
const extractYouTubeId = (url: string): { type: 'video' | 'playlist'; id: string } | null => {
  // Playlist format
  const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch) {
    return { type: 'playlist', id: playlistMatch[1]! };
  }

  // Video format (youtube.com/watch)
  const videoMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (videoMatch) {
    return { type: 'video', id: videoMatch[1]! };
  }

  // Short URL format (youtu.be/VIDEO_ID)
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return { type: 'video', id: shortMatch[1]! };
  }

  return null;
};

/**
 * Generate YouTube embed iframe code
 */
export const generateYouTubeEmbed = (url: string): string | null => {
  const youtubeData = extractYouTubeId(url);

  if (!youtubeData) {
    return null;
  }

  let embedUrl: string;

  if (youtubeData.type === 'playlist') {
    embedUrl = `https://www.youtube.com/embed/videoseries?list=${youtubeData.id}`;
  } else {
    embedUrl = `https://www.youtube.com/embed/${youtubeData.id}`;
  }

  return `<iframe
    width="100%"
    height="315"
    src="${embedUrl}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    loading="lazy">
  </iframe>`;
};

/**
 * Validate if a URL is a valid music platform URL
 */
export const validateMusicUrl = (url: string): boolean => {
  const platform = detectPlatform(url);

  if (platform === 'unknown') {
    return false;
  }

  if (platform === 'spotify') {
    return extractSpotifyId(url) !== null;
  }

  if (platform === 'youtube') {
    return extractYouTubeId(url) !== null;
  }

  return false;
};

/**
 * Extract playlist name from URL (best effort)
 */
export const extractPlaylistName = (url: string): string => {
  const platform = detectPlatform(url);

  // For Spotify, we can't easily get the name without API
  if (platform === 'spotify') {
    const spotifyData = extractSpotifyId(url);
    return spotifyData ? `Spotify ${spotifyData.type}` : 'Spotify Playlist';
  }

  // For YouTube, check if there's a title in the URL
  if (platform === 'youtube') {
    const youtubeData = extractYouTubeId(url);
    return youtubeData?.type === 'playlist' ? 'YouTube Playlist' : 'YouTube Video';
  }

  return 'Unknown Playlist';
};
