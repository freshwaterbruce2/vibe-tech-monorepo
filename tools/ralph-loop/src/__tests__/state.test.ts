import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendProgress,
  assertSpecsImmutable,
  createDefaultTaskPlan,
  loadProgress,
  loadSpecs,
  loadTaskPlan,
  saveTaskPlan,
} from '../state.js';
import type { LoopSpec } from '../types.js';

describe('state', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ralph-loop-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('loads specs from directory', async () => {
    await writeFile(join(tempDir, 'SPEC-001.md'), '# Objective A\nDetails');
    await writeFile(join(tempDir, 'SPEC-002.md'), '# Objective B\nMore');

    const specs = await loadSpecs(tempDir);

    expect(specs).toHaveLength(2);
    expect(specs.map((s) => s.id).sort()).toEqual(['SPEC-001', 'SPEC-002']);
    expect(specs.find((s) => s.id === 'SPEC-001')?.objective).toBe('Objective A');
  });

  it('returns default task plan when file is missing', async () => {
    const plan = await loadTaskPlan(join(tempDir, 'missing.json'));
    expect(plan).toEqual(createDefaultTaskPlan());
  });

  it('round-trips task plan', async () => {
    const path = join(tempDir, 'plan.json');
    const plan = {
      phase: 'implement',
      tasks: [{ id: 't1', description: 'task', status: 'in_progress' as const }],
      context: { key: 'value' },
      done: false,
    };

    await saveTaskPlan(path, plan);
    const loaded = await loadTaskPlan(path);

    expect(loaded).toEqual(plan);
  });

  it('appends progress entries', async () => {
    const path = join(tempDir, 'progress.md');
    await appendProgress(path, 'first');
    await appendProgress(path, 'second');

    const entries = await loadProgress(path);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain('first');
    expect(entries[1]).toContain('second');
  });

  it('throws when specs are mutated', async () => {
    const specPath = join(tempDir, 'SPEC-001.md');
    await writeFile(specPath, '# Original');

    const specs = await loadSpecs(tempDir);
    await writeFile(specPath, '# Mutated');

    await expect(assertSpecsImmutable(specs)).rejects.toThrow('Spec SPEC-001 was mutated');
  });

  it('does not throw when specs are unchanged', async () => {
    const specPath = join(tempDir, 'SPEC-001.md');
    await writeFile(specPath, '# Original');

    const specs: LoopSpec[] = [
      {
        id: 'SPEC-001',
        objective: 'Original',
        content: '# Original',
        path: specPath,
      },
    ];

    await expect(assertSpecsImmutable(specs)).resolves.toBeUndefined();
  });
});
