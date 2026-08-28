/**
 * Masks an API key for safe display in logs or UI.
 * Shows only the first 8 characters; short or missing keys are fully redacted.
 *
 * Never logs or returns the full key.
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }
  return `${apiKey.substring(0, 8)}...`;
}
