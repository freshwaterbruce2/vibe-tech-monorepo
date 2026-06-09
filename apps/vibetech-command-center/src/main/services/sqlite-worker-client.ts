import { Worker } from 'node:worker_threads';
import { join } from 'node:path';

function getWorkerInstance(): Worker {
  try {
    // Dynamically require ?nodeWorker to hide it from standard tsc Node16 compiler
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const createWorker = require('./sqlite-worker?nodeWorker');
    const creator = createWorker.default || createWorker;
    return creator({});
  } catch {
    // Fallback to standard Node worker threads using path resolution (used in MCP target)
    const workerPath = join(__dirname, 'sqlite-worker.js');
    return new Worker(workerPath);
  }
}

export class SqliteWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, { resolve: (val: any) => void; reject: (err: Error) => void }>();
  private nextId = 0;


  private getWorker(): Worker {
    if (!this.worker) {
      const worker = getWorkerInstance();
      worker.on('message', (msg: { id: string; success: boolean; data?: any; error?: string }) => {
        const handler = this.pending.get(msg.id);
        if (handler) {
          this.pending.delete(msg.id);
          if (msg.success) {
            handler.resolve(msg.data);
          } else {
            handler.reject(new Error(msg.error ?? 'Unknown worker error'));
          }
        }
      });
      worker.on('error', (err) => {
        console.error('SQLite worker thread error:', err);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        for (const handler of this.pending.values()) {
          handler.reject(errorObj);
        }
        this.pending.clear();
        this.worker = null;
      });
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.warn('SQLite worker thread exited with code', code);
        }
        const err = new Error(`SQLite worker exited with code ${code}`);
        for (const handler of this.pending.values()) {
          handler.reject(err);
        }
        this.pending.clear();
        this.worker = null;
      });
      this.worker = worker;
    }
    return this.worker;
  }

  async runAction<T>(action: string, payload: any): Promise<T> {
    // If running in Vitest/testing environment, execute action in-process via ES dynamic import
    // to utilize vitest mocks of fs, better-sqlite3, etc.
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      // Use explicit .js extension to satisfy Node16 ESM module resolution
      const { handleWorkerAction } = await import('./sqlite-worker.js');
      return new Promise<T>((resolve, reject) => {
        handleWorkerAction(
          { id: 'test-direct', action, payload },
          (res: { success: boolean; data?: any; error?: string }) => {
            if (res.success) {
              resolve(res.data);
            } else {
              reject(new Error(res.error ?? 'Test direct run error'));
            }
          }
        );
      });
    }

    const id = String(this.nextId++);
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.getWorker().postMessage({ id, action, payload });
      } catch (err) {
        this.pending.delete(id);
        reject(err as Error);
      }
    });
  }

  terminate(): void {
    if (this.worker) {
      void this.worker.terminate();
      this.worker = null;
    }
  }
}

export const sqliteWorkerClient = new SqliteWorkerClient();
