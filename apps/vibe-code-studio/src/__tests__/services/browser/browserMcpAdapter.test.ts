/**
 * browserMcpAdapter tests — allowlist validation (AC #3), action → playwright
 * MCP tool mapping, human-readable audit lines (AC #11), and defensive result
 * parsing where malformed/errored MCP output becomes structured errors the
 * agent can react to instead of passing through uninterpreted (AC #10).
 */
import { describe, expect, it } from 'vitest';
import {
  describeAction,
  MAX_SCREENSHOT_DATA_URL_CHARS,
  parseBrowserAction,
  parseConsoleLines,
  parseToolResult,
  toMcpToolCall,
} from '../../../services/browser/browserMcpAdapter';
import type { BrowserAction } from '../../../services/browser/types';

const navigate: BrowserAction = { browserAction: 'navigate', url: 'http://localhost:5173/' };
const click: BrowserAction = { browserAction: 'click', element: 'Submit', ref: 'e1' };
const type: BrowserAction = { browserAction: 'type', element: 'Email', ref: 'e2', text: 'a@b.c' };
const snapshot: BrowserAction = { browserAction: 'snapshot' };
const readConsole: BrowserAction = { browserAction: 'read_console' };
const screenshot: BrowserAction = { browserAction: 'screenshot', fullPage: true };

describe('parseBrowserAction (allowlist)', () => {
  it('accepts every allowlisted variant', () => {
    for (const action of [navigate, click, type, snapshot, readConsole, screenshot]) {
      expect(parseBrowserAction(action)).toEqual(action);
    }
  });

  it('strips unknown extra keys (agent params carry unrelated fields)', () => {
    const parsed = parseBrowserAction({
      browserAction: 'navigate',
      url: 'http://x/',
      backgroundTaskId: 'bg-1',
      injectedUserMessages: ['note'],
    });
    expect(parsed).toEqual({ browserAction: 'navigate', url: 'http://x/' });
  });

  it('rejects actions outside the allowlist even if the MCP would support them', () => {
    expect(parseBrowserAction({ browserAction: 'evaluate', code: 'alert(1)' })).toBeNull();
    expect(parseBrowserAction({ browserAction: 'run_code', code: '1' })).toBeNull();
  });

  it('rejects variants missing required params', () => {
    expect(parseBrowserAction({ browserAction: 'navigate' })).toBeNull();
    expect(parseBrowserAction({ browserAction: 'click', element: 'x' })).toBeNull();
    expect(parseBrowserAction({ browserAction: 'type', element: 'x', ref: 'e1' })).toBeNull();
  });

  it('rejects non-object and empty input', () => {
    expect(parseBrowserAction(undefined)).toBeNull();
    expect(parseBrowserAction('navigate')).toBeNull();
    expect(parseBrowserAction({})).toBeNull();
  });
});

describe('toMcpToolCall', () => {
  it('maps each action to its @playwright/mcp tool', () => {
    expect(toMcpToolCall(navigate)).toEqual({
      tool: 'browser_navigate',
      args: { url: 'http://localhost:5173/' },
    });
    expect(toMcpToolCall(click)).toEqual({
      tool: 'browser_click',
      args: { element: 'Submit', ref: 'e1' },
    });
    expect(toMcpToolCall(type)).toEqual({
      tool: 'browser_type',
      args: { element: 'Email', ref: 'e2', text: 'a@b.c' },
    });
    expect(toMcpToolCall(snapshot)).toEqual({ tool: 'browser_snapshot', args: {} });
    expect(toMcpToolCall(readConsole)).toEqual({ tool: 'browser_console_messages', args: {} });
    expect(toMcpToolCall(screenshot)).toEqual({
      tool: 'browser_take_screenshot',
      args: { fullPage: true },
    });
  });

  it('omits fullPage when unspecified', () => {
    expect(toMcpToolCall({ browserAction: 'screenshot' })).toEqual({
      tool: 'browser_take_screenshot',
      args: {},
    });
  });
});

describe('describeAction (audit log lines)', () => {
  it('renders a human-readable line per action', () => {
    expect(describeAction(navigate)).toBe('Navigate to http://localhost:5173/');
    expect(describeAction(click)).toBe('Click "Submit" (ref e1)');
    expect(describeAction(type)).toBe('Type "a@b.c" into "Email" (ref e2)');
    expect(describeAction(snapshot)).toBe('Capture accessibility snapshot');
    expect(describeAction(readConsole)).toBe('Read console messages');
    expect(describeAction(screenshot)).toBe('Take full-page screenshot');
    expect(describeAction({ browserAction: 'screenshot' })).toBe('Take screenshot');
  });
});

describe('parseConsoleLines', () => {
  it('parses "[LEVEL] text" lines and lowercases the level', () => {
    expect(parseConsoleLines('[ERROR] boom\n[LOG] hello')).toEqual([
      { level: 'error', text: 'boom' },
      { level: 'log', text: 'hello' },
    ]);
  });

  it('treats unshaped lines as log entries and skips blanks', () => {
    expect(parseConsoleLines('plain message\n\n  ')).toEqual([
      { level: 'log', text: 'plain message' },
    ]);
  });
});

describe('parseToolResult', () => {
  it('rejects a malformed result (missing content) as a protocol error', () => {
    expect(parseToolResult(navigate, null)?.error?.code).toBe('protocol_error');
    expect(parseToolResult(navigate, {})?.error?.code).toBe('protocol_error');
  });

  it('maps isError results to structured server errors with the tool text', () => {
    const result = parseToolResult(click, {
      isError: true,
      content: [{ type: 'text', text: 'element not found' }],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toEqual({ code: 'server_error', message: 'element not found' });
  });

  it('falls back to a generic server error message when no text is present', () => {
    const result = parseToolResult(click, { isError: true, content: [] });
    expect(result.error?.message).toBe('Browser tool reported an error');
  });

  it('returns text output for navigate/snapshot-style actions', () => {
    const result = parseToolResult(snapshot, {
      content: [
        { type: 'text', text: 'page title' },
        { type: 'text', text: '- button "Submit" [ref=e1]' },
      ],
    });
    expect(result).toEqual({
      ok: true,
      action: 'snapshot',
      text: 'page title\n- button "Submit" [ref=e1]',
    });
  });

  it('omits text when the tool returned none', () => {
    expect(parseToolResult(navigate, { content: [] }).text).toBeUndefined();
  });

  it('parses console output into structured messages', () => {
    const result = parseToolResult(readConsole, {
      content: [{ type: 'text', text: '[WARNING] slow request' }],
    });
    expect(result.ok).toBe(true);
    expect(result.consoleMessages).toEqual([{ level: 'warning', text: 'slow request' }]);
  });

  it('builds a data URL from screenshot image content', () => {
    const result = parseToolResult(screenshot, {
      content: [{ type: 'image', data: 'AAAA', mimeType: 'image/jpeg' }],
    });
    expect(result.ok).toBe(true);
    expect(result.imageDataUrl).toBe('data:image/jpeg;base64,AAAA');
  });

  it('defaults the screenshot mime type to image/png', () => {
    const result = parseToolResult(screenshot, { content: [{ type: 'image', data: 'BBBB' }] });
    expect(result.imageDataUrl).toBe('data:image/png;base64,BBBB');
  });

  it('flags a screenshot result without image data as a protocol error', () => {
    const result = parseToolResult(screenshot, { content: [{ type: 'text', text: 'oops' }] });
    expect(result.error?.code).toBe('protocol_error');
  });

  it('rejects screenshots beyond the embed cap', () => {
    const result = parseToolResult(screenshot, {
      content: [{ type: 'image', data: 'x'.repeat(MAX_SCREENSHOT_DATA_URL_CHARS + 1) }],
    });
    expect(result.error?.code).toBe('screenshot_too_large');
  });
});
