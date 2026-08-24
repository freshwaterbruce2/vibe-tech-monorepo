/**
 * AIChat MessageItem helpers
 * Non-component utilities shared by chat message components.
 * Kept out of MessageItem.tsx so Fast Refresh works (react-refresh/only-export-components).
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}
