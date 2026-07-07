/** Pipeline status emitted by the Rust backend via the `vibe-flow://status` event. */
export type FlowStatus = 'idle' | 'listening' | 'processing' | 'injected' | 'error';

export const STATUS_EVENT = 'vibe-flow://status';

export interface StatusPayload {
  status: FlowStatus;
  detail?: string;
}

const LABELS: Record<FlowStatus, string> = {
  idle: 'Idle — press Ctrl+Shift+Space in any app',
  listening: 'Listening…',
  processing: 'Processing…',
  injected: 'Text injected',
  error: 'Error',
};

/** Human-readable label for a status, including optional detail. */
export function statusLabel(payload: StatusPayload): string {
  const base = LABELS[payload.status];
  return payload.detail ? `${base}: ${payload.detail}` : base;
}

/** Narrow an unknown event payload to a StatusPayload (events cross the IPC boundary untyped). */
export function parseStatusPayload(value: unknown): StatusPayload | null {
  if (typeof value !== 'object' || value === null) return null;
  const obj = value as Record<string, unknown>;
  const status = obj.status;
  if (
    status !== 'idle' &&
    status !== 'listening' &&
    status !== 'processing' &&
    status !== 'injected' &&
    status !== 'error'
  ) {
    return null;
  }
  const detail = typeof obj.detail === 'string' ? obj.detail : undefined;
  return { status, detail };
}
