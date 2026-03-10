import { describe, expect, it, vi } from 'vitest';

import { SessionManager } from './session-manager';
import type { AgentMemoryMessage } from '../capabilities/ai-integration';

function createFakeAgent() {
  let memory: AgentMemoryMessage[] = [];
  return {
    restoreMemorySnapshot(snapshot: AgentMemoryMessage[]) {
      memory = snapshot.map((entry) => ({ ...entry }));
    },
    captureMemorySnapshot(): AgentMemoryMessage[] {
      return memory.map((entry) => ({ ...entry }));
    },
    async chat(message: string): Promise<string> {
      memory.push({ role: 'user', content: message });
      const reply = `reply:${message}`;
      memory.push({ role: 'assistant', content: reply });
      return reply;
    },
    getMemory(): AgentMemoryMessage[] {
      return memory.map((entry) => ({ ...entry }));
    },
  };
}

describe('SessionManager', () => {
  it('isolates memory snapshots per session', async () => {
    const manager = new SessionManager();
    const agent = createFakeAgent();

    const alphaReply = await manager.withSession('alpha', agent, async () => agent.chat('hello'));
    const betaReply = await manager.withSession('beta', agent, async () => agent.chat('world'));
    const alphaMemory = await manager.withSession('alpha', agent, async () => agent.captureMemorySnapshot());
    const betaMemory = await manager.withSession('beta', agent, async () => agent.captureMemorySnapshot());

    expect(alphaReply).toBe('reply:hello');
    expect(betaReply).toBe('reply:world');
    expect(alphaMemory).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'reply:hello' },
    ]);
    expect(betaMemory).toEqual([
      { role: 'user', content: 'world' },
      { role: 'assistant', content: 'reply:world' },
    ]);
    expect(agent.getMemory()).toEqual([]);
  });

  it('serializes concurrent work on the shared agent instance', async () => {
    const manager = new SessionManager();
    const starts: string[] = [];
    const finishes: string[] = [];
    const agent = {
      restoreMemorySnapshot: vi.fn(),
      captureMemorySnapshot: vi.fn(() => []),
    };

    const first = manager.withSession('one', agent, async () => {
      starts.push('first');
      await new Promise((resolve) => setTimeout(resolve, 20));
      finishes.push('first');
    });

    const second = manager.withSession('two', agent, async () => {
      starts.push('second');
      finishes.push('second');
    });

    await Promise.all([first, second]);

    expect(starts).toEqual(['first', 'second']);
    expect(finishes).toEqual(['first', 'second']);
  });
});
