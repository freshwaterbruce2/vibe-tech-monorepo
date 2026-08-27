/**
 * Browser MCP adapter — pure mapping between the Phase-1 browser action
 * allowlist and the `playwright` MCP server's tools (@playwright/mcp), plus
 * defensive parsing of tool results into structured BrowserActionResults.
 * Keeps the MCP swappable: call sites only see the typed contract.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { z } from 'zod';
import type {
  BrowserAction,
  BrowserActionResult,
  BrowserConsoleMessage,
  McpToolResultLike,
} from './types';

/** Embed cap for screenshot artifacts (data URL chars ≈ bytes × 4/3) */
export const MAX_SCREENSHOT_DATA_URL_CHARS = 4_000_000;

const browserActionSchema = z.discriminatedUnion('browserAction', [
  z.object({ browserAction: z.literal('navigate'), url: z.string().min(1) }),
  z.object({
    browserAction: z.literal('click'),
    element: z.string().min(1),
    ref: z.string().min(1),
  }),
  z.object({
    browserAction: z.literal('type'),
    element: z.string().min(1),
    ref: z.string().min(1),
    text: z.string(),
  }),
  z.object({ browserAction: z.literal('snapshot') }),
  z.object({ browserAction: z.literal('read_console') }),
  z.object({ browserAction: z.literal('screenshot'), fullPage: z.boolean().optional() }),
]);

/**
 * Validate raw agent params against the allowlist. Unknown/extra keys are
 * dropped; anything not matching a variant returns null (spec AC #3/#10).
 */
export function parseBrowserAction(params: unknown): BrowserAction | null {
  const result = browserActionSchema.safeParse(params);
  return result.success ? result.data : null;
}

/** Map an allowlisted action to the @playwright/mcp tool call */
export function toMcpToolCall(action: BrowserAction): {
  tool: string;
  args: Record<string, unknown>;
} {
  switch (action.browserAction) {
    case 'navigate':
      return { tool: 'browser_navigate', args: { url: action.url } };
    case 'click':
      return { tool: 'browser_click', args: { element: action.element, ref: action.ref } };
    case 'type':
      return {
        tool: 'browser_type',
        args: { element: action.element, ref: action.ref, text: action.text },
      };
    case 'snapshot':
      return { tool: 'browser_snapshot', args: {} };
    case 'read_console':
      return { tool: 'browser_console_messages', args: {} };
    case 'screenshot':
      return {
        tool: 'browser_take_screenshot',
        args: action.fullPage === undefined ? {} : { fullPage: action.fullPage },
      };
  }
}

/** Human-readable audit line for the session's action log (spec AC #11) */
export function describeAction(action: BrowserAction): string {
  switch (action.browserAction) {
    case 'navigate':
      return `Navigate to ${action.url}`;
    case 'click':
      return `Click "${action.element}" (ref ${action.ref})`;
    case 'type':
      return `Type ${JSON.stringify(action.text)} into "${action.element}" (ref ${action.ref})`;
    case 'snapshot':
      return 'Capture accessibility snapshot';
    case 'read_console':
      return 'Read console messages';
    case 'screenshot':
      return action.fullPage ? 'Take full-page screenshot' : 'Take screenshot';
  }
}

/** Best-effort parse of "[LEVEL] text" console lines from @playwright/mcp */
export function parseConsoleLines(text: string): BrowserConsoleMessage[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = /^\[([A-Za-z]+)\]\s*(.*)$/.exec(line);
      return match
        ? { level: (match[1] ?? 'log').toLowerCase(), text: match[2] ?? '' }
        : { level: 'log', text: line };
    });
}

function collectText(result: McpToolResultLike): string {
  return (result.content ?? [])
    .filter(item => item.type === 'text' && typeof item.text === 'string')
    .map(item => item.text)
    .join('\n');
}

function findImageDataUrl(result: McpToolResultLike): string | null {
  const image = (result.content ?? []).find(
    item => item.type === 'image' && typeof item.data === 'string' && item.data.length > 0
  );
  if (!image) return null;
  return `data:${image.mimeType ?? 'image/png'};base64,${image.data}`;
}

function failure(
  action: BrowserAction,
  code: NonNullable<BrowserActionResult['error']>['code'],
  message: string
): BrowserActionResult {
  return { ok: false, action: action.browserAction, error: { code, message } };
}

/**
 * Decode an MCP tool result into the structured contract. Malformed results
 * become protocol errors instead of leaking through uninterpreted.
 */
export function parseToolResult(
  action: BrowserAction,
  result: McpToolResultLike | null | undefined
): BrowserActionResult {
  if (!result || !Array.isArray(result.content)) {
    return failure(action, 'protocol_error', 'MCP returned a malformed tool result');
  }
  const text = collectText(result);
  if (result.isError) {
    return failure(action, 'server_error', text || 'Browser tool reported an error');
  }
  if (action.browserAction === 'screenshot') {
    const imageDataUrl = findImageDataUrl(result);
    if (!imageDataUrl) {
      return failure(action, 'protocol_error', 'Screenshot result contained no image data');
    }
    if (imageDataUrl.length > MAX_SCREENSHOT_DATA_URL_CHARS) {
      return failure(
        action,
        'screenshot_too_large',
        `Screenshot exceeds the ${MAX_SCREENSHOT_DATA_URL_CHARS}-char embed cap`
      );
    }
    return { ok: true, action: action.browserAction, text: text || undefined, imageDataUrl };
  }
  if (action.browserAction === 'read_console') {
    return {
      ok: true,
      action: action.browserAction,
      text: text || undefined,
      consoleMessages: parseConsoleLines(text),
    };
  }
  return { ok: true, action: action.browserAction, text: text || undefined };
}
