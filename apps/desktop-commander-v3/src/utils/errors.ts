/** Extract a string message from any thrown value. */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
