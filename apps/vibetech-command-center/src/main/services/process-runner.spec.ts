import { describe, it, expect } from 'vitest';
import { ProcessRunner } from './process-runner';
import type { ProcessChunk } from '@shared/types';

describe('ProcessRunner', () => {
  const node = process.execPath;

  it('captures stdout line-by-line', async () => {
    const runner = new ProcessRunner();
    const chunks: ProcessChunk[] = [];
    runner.on('chunk', (c: ProcessChunk) => chunks.push(c));

    const handle = runner.spawn({
      command: node,
      args: ['-e', 'console.log("line1"); console.log("line2");'],
      cwd: process.cwd()
    });

    const exited = await runner.waitFor(handle.id, 5_000);
    expect(exited.status).toBe('exited');
    expect(exited.exitCode).toBe(0);
    const stdout = chunks.filter((c) => c.stream === 'stdout').map((c) => c.data);
    expect(stdout).toContain('line1');
    expect(stdout).toContain('line2');
  });

  it('captures stderr separately from stdout', async () => {
    const runner = new ProcessRunner();
    const chunks: ProcessChunk[] = [];
    runner.on('chunk', (c: ProcessChunk) => chunks.push(c));

    const handle = runner.spawn({
      command: node,
      args: ['-e', 'console.error("oops"); process.exit(3);'],
      cwd: process.cwd()
    });
    const exited = await runner.waitFor(handle.id, 5_000);
    expect(exited.exitCode).toBe(3);
    const stderr = chunks.filter((c) => c.stream === 'stderr').map((c) => c.data);
    expect(stderr.join('\n')).toContain('oops');
  });

  it('kills a running process', async () => {
    const runner = new ProcessRunner();
    const handle = runner.spawn({
      command: node,
      args: ['-e', 'setInterval(() => {}, 1000);'],
      cwd: process.cwd()
    });
    expect(handle.status).toBe('running');
    expect(runner.kill(handle.id)).toBe(true);
    const exited = await runner.waitFor(handle.id, 5_000);
    expect(['killed', 'exited']).toContain(exited.status);
  });

  it('enforces timeoutMs', async () => {
    const runner = new ProcessRunner();
    const handle = runner.spawn({
      command: node,
      args: ['-e', 'setInterval(() => {}, 1000);'],
      cwd: process.cwd(),
      timeoutMs: 300
    });
    const exited = await runner.waitFor(handle.id, 5_000);
    expect(['killed', 'exited']).toContain(exited.status);
  });

  it('tracks multiple concurrent processes', async () => {
    const runner = new ProcessRunner();
    const h1 = runner.spawn({ command: node, args: ['-e', 'console.log(1);'], cwd: process.cwd() });
    const h2 = runner.spawn({ command: node, args: ['-e', 'console.log(2);'], cwd: process.cwd() });
    expect(runner.list()).toHaveLength(2);
    await runner.waitFor(h1.id, 5_000);
    await runner.waitFor(h2.id, 5_000);
    expect(runner.get(h1.id)?.status).toBe('exited');
    expect(runner.get(h2.id)?.status).toBe('exited');
  });
});
