export async function copyToClipboard(text: string, label: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    console.log(`Copied ${label} to clipboard!`);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

export function parseTagBlocks(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tags = [
    'TITLES', 'HOOK', 'BODY', 'OUTRO', 'DESCRIPTION', 'TAGS', 'THUMBNAIL_PROMPT',
    'AVATAR_NAME', 'VISUAL_THEME', 'GENERATIVE_AI_PROMPT', 'CHANNEL_BRANDING'
  ];

  let currentTag: string | null = null;
  const currentContent: string[] = [];

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const matchedTag = tags.find(t => `[${t}]`.toLowerCase() === trimmed.toLowerCase());

    if (matchedTag) {
      if (currentTag) {
        result[currentTag] = currentContent.join('\n').trim();
      }
      currentTag = matchedTag;
      currentContent.length = 0; // Clear array
    } else {
      if (currentTag !== null) {
        currentContent.push(line);
      }
    }
  }

  if (currentTag) {
    result[currentTag] = currentContent.join('\n').trim();
  }

  return result;
}

export function getStoredApiKey(): string {
  return localStorage.getItem('GEMINI_API_KEY') ?? '';
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem('GEMINI_API_KEY', key);
}
