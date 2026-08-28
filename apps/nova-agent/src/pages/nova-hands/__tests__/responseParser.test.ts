import { describe, expect, it } from 'vitest';
import { parseAgentResponse } from '../responseParser';
import type { AgentAction } from '../types';

describe('parseAgentResponse', () => {
  it('parses JSON from markdown code fences', () => {
    const action: AgentAction = { type: 'mouse', action: 'click', x: 450, y: 200 };
    const raw = `\`\`\`json\n{\n  "thought": "Click the button.",\n  "action": ${JSON.stringify(action)}\n}\n\`\`\``;
    const parsed = parseAgentResponse(raw);
    expect(parsed.thought).toBe('Click the button.');
    expect(parsed.action).toEqual(action);
  });

  it('parses raw JSON when no fences are present', () => {
    const action: AgentAction = { type: 'keyboard', action: 'type', text: 'hello' };
    const raw = JSON.stringify({ thought: 'Type a greeting.', action });
    const parsed = parseAgentResponse(raw);
    expect(parsed.thought).toBe('Type a greeting.');
    expect(parsed.action).toEqual(action);
  });

  it('parses done action', () => {
    const raw = `\`\`\`json\n{\n  "thought": "Task complete.",\n  "action": { "type": "done" }\n}\n\`\`\``;
    const parsed = parseAgentResponse(raw);
    expect(parsed.thought).toBe('Task complete.');
    expect(parsed.action).toEqual({ type: 'done' });
  });

  it('throws for missing JSON', () => {
    expect(() => parseAgentResponse('   ')).toThrow('No JSON content found in agent response.');
  });

  it('throws for invalid JSON', () => {
    expect(() => parseAgentResponse('not { valid json')).toThrow('Failed to parse agent response JSON');
  });

  it('throws for missing thought', () => {
    const raw = JSON.stringify({ action: { type: 'done' } });
    expect(() => parseAgentResponse(raw)).toThrow("Agent response missing or invalid 'thought' field.");
  });

  it('throws for missing action', () => {
    const raw = JSON.stringify({ thought: 'Missing action.' });
    expect(() => parseAgentResponse(raw)).toThrow("Agent response missing or invalid 'action' field.");
  });
});
