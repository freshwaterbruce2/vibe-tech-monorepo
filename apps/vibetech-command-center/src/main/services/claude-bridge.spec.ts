import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClaudeBridge } from './claude-bridge';
import type { ClaudeStreamEvent } from '@shared/types';

describe('ClaudeBridge', () => {
  const makeMockClaude = (tmpRoot: string, lines: string[]): string => {
    const mockPath = join(tmpRoot, 'mock-claude.cjs');
    const body = `
      const out = ${JSON.stringify(lines)};
      for (const l of out) { process.stdout.write(l + "\\n"); }
      process.exit(0);
    `;
    writeFileSync(mockPath, body);
    return mockPath;
  };

  it('parses stream-json and extracts session id, result, cost', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-'));
    try {
      const lines = [
        JSON.stringify({ type: 'system', subtype: 'init', session_id: 'abc-123' }),
        JSON.stringify({ type: 'assistant', message: { content: 'thinking...' } }),
        JSON.stringify({
          type: 'result',
          subtype: 'success',
          session_id: 'abc-123',
          result: 'Task complete.',
          total_cost_usd: 0.0142,
          num_turns: 3,
          is_error: false
        })
      ];
      const mockPath = makeMockClaude(tmpRoot, lines);

      class TestBridge extends ClaudeBridge {
        protected override buildArgs() { return [mockPath]; }
      }
      const tb = new TestBridge({ claudeCommand: process.execPath });
      const events: ClaudeStreamEvent[] = [];
      tb.on('stream', (e: ClaudeStreamEvent) => events.push(e));

      const result = await tb.invoke({
        prompt: 'test',
        cwd: tmpRoot,
        allowedTools: ['Read']
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('abc-123');
      expect(result.resultText).toBe('Task complete.');
      expect(result.totalCostUsd).toBeCloseTo(0.0142);
      expect(result.numTurns).toBe(3);
      expect(events.some((e) => e.type === 'system')).toBe(true);
      expect(events.some((e) => e.type === 'result')).toBe(true);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('emits raw event for un-parseable output', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-'));
    try {
      const lines = ['not-json-at-all', '{"type":"result","result":"ok"}'];
      const mockPath = join(tmpRoot, 'mock.cjs');
      writeFileSync(
        mockPath,
        `const out=${JSON.stringify(lines)};for(const l of out){process.stdout.write(l+"\\n");}process.exit(0);`
      );

      class TestBridge extends ClaudeBridge {
        protected override buildArgs() { return [mockPath]; }
      }
      const tb = new TestBridge({ claudeCommand: process.execPath });
      const events: ClaudeStreamEvent[] = [];
      tb.on('stream', (e: ClaudeStreamEvent) => events.push(e));

      await tb.invoke({ prompt: 't', cwd: tmpRoot, allowedTools: ['Read'] });
      expect(events.some((e) => e.type === 'raw')).toBe(true);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('reports failure on non-zero exit', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-'));
    try {
      const mockPath = join(tmpRoot, 'fail.cjs');
      writeFileSync(mockPath, `process.stderr.write("boom");process.exit(2);`);
      class TestBridge extends ClaudeBridge {
        protected override buildArgs() { return [mockPath]; }
      }
      const tb = new TestBridge({ claudeCommand: process.execPath });
      const result = await tb.invoke({ prompt: 't', cwd: tmpRoot, allowedTools: ['Read'] });
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('constructs correct argv with resume and permission mode', () => {
    class Spy extends ClaudeBridge {
      public inspect(inv: Parameters<typeof this.invoke>[0]) { return this.buildArgs(inv); }
    }
    const s = new Spy();
    const args = s.inspect({
      prompt: 'do it',
      cwd: 'C:\\dev',
      allowedTools: ['Read', 'Edit', 'Bash'],
      resumeSessionId: 'sess-1',
      permissionMode: 'acceptEdits',
      appendSystemPrompt: 'be terse'
    });
    expect(args).toContain('-p');
    expect(args).toContain('do it');
    expect(args).toContain('stream-json');
    expect(args).toContain('Read,Edit,Bash');
    expect(args).toContain('--resume');
    expect(args).toContain('sess-1');
    expect(args).toContain('--permission-mode');
    expect(args).toContain('acceptEdits');
    expect(args).toContain('--append-system-prompt');
    expect(args).toContain('be terse');
  });
});
