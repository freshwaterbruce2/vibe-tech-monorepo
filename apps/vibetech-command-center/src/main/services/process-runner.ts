import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import type { ProcessHandle, ProcessChunk, ProcessStatus } from '../../shared/types';

export interface ProcessSpec {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

interface Tracked {
  handle: ProcessHandle;
  proc: ChildProcess;
  timeoutTimer: NodeJS.Timeout | null;
}

export class ProcessRunner extends EventEmitter {
  private tracked = new Map<string, Tracked>();

  spawn(spec: ProcessSpec): ProcessHandle {
    const id = randomUUID();
    const proc = spawn(spec.command, [...spec.args], {
      cwd: spec.cwd,
      env: { ...process.env, ...(spec.env ?? {}) },
      shell: false,
      windowsHide: true
    });

    const handle: ProcessHandle = {
      id,
      command: spec.command,
      args: spec.args,
      cwd: spec.cwd,
      pid: proc.pid ?? null,
      status: 'running',
      startedAt: Date.now(),
      exitCode: null
    };

    const timeoutTimer = spec.timeoutMs
      ? setTimeout(() => this.kill(id, 'SIGTERM'), spec.timeoutMs)
      : null;

    const tracked: Tracked = { handle, proc, timeoutTimer };
    this.tracked.set(id, tracked);

    if (proc.stdout) {
      const rl = createInterface({ input: proc.stdout });
      rl.on('line', (line) => this.emitChunk(id, 'stdout', line));
    }
    if (proc.stderr) {
      const rl = createInterface({ input: proc.stderr });
      rl.on('line', (line) => this.emitChunk(id, 'stderr', line));
    }

    proc.on('error', (err) => {
      this.updateStatus(id, 'error', null);
      this.emit('error', { processId: id, error: err.message });
    });

    proc.on('close', (code) => {
      const t = this.tracked.get(id);
      const status: ProcessStatus = t?.handle.status === 'killed' ? 'killed' : 'exited';
      this.updateStatus(id, status, code);
      if (tracked.timeoutTimer) clearTimeout(tracked.timeoutTimer);
      this.emit('exit', { ...this.tracked.get(id)!.handle });
    });

    return { ...handle };
  }

  kill(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const t = this.tracked.get(id);
    if (!t || t.handle.status !== 'running') return false;
    t.handle.status = 'killed';
    return t.proc.kill(signal);
  }

  get(id: string): ProcessHandle | null {
    const t = this.tracked.get(id);
    return t ? { ...t.handle } : null;
  }

  list(): ProcessHandle[] {
    return Array.from(this.tracked.values()).map((t) => ({ ...t.handle }));
  }

  async waitFor(id: string, timeoutMs = 30_000): Promise<ProcessHandle> {
    const existing = this.tracked.get(id);
    if (!existing) throw new Error(`unknown process ${id}`);
    if (existing.handle.status !== 'running') return { ...existing.handle };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('waitFor timeout')), timeoutMs);
      const onExit = (h: ProcessHandle) => {
        if (h.id === id) {
          clearTimeout(timer);
          this.off('exit', onExit);
          resolve(h);
        }
      };
      this.on('exit', onExit);
    });
  }

  private updateStatus(id: string, status: ProcessStatus, exitCode: number | null): void {
    const t = this.tracked.get(id);
    if (!t) return;
    t.handle.status = status;
    t.handle.exitCode = exitCode;
    t.handle.exitedAt = Date.now();
  }

  private emitChunk(processId: string, stream: 'stdout' | 'stderr', data: string): void {
    const chunk: ProcessChunk = { processId, stream, data, timestamp: Date.now() };
    this.emit('chunk', chunk);
  }
}
