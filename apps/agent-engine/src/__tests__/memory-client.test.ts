import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MemoryClient } from '../services/memory-client.js';

describe('memory client', () => {
  it('persists episodic, semantic, and policy records locally and can search anti-patterns', async () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-engine-memory-'));
    const client = new MemoryClient('http://127.0.0.1:65535', root);

    await client.add({
      kind: 'episodic',
      title: 'Task planning',
      text: 'Planned a safe repo-local change.',
      tags: ['task-run'],
      metadata: { taskId: 'task-1' },
    });
    await client.add({
      kind: 'policy',
      title: 'Promotion threshold',
      text: 'Benchmark score must stay above 0.8.',
      tags: ['candidate'],
    });
    await client.logAntiPattern('Rejected candidate', 'Touched forbidden area .github/workflows.');

    const recent = client.getRecent({ limit: 3 });
    const antiPatterns = client.search('forbidden area', { tag: 'anti-pattern', limit: 5 });

    expect(recent).toHaveLength(3);
    expect(recent.map((record) => record.kind)).toEqual(
      expect.arrayContaining(['episodic', 'policy', 'semantic']),
    );
    expect(antiPatterns).toHaveLength(1);
    expect(antiPatterns[0]?.metadata?.category).toBe('anti-pattern');
    expect(antiPatterns[0]?.tags).toContain('rejected-candidate');

    rmSync(root, { recursive: true, force: true });
  });
});
