import { EventEmitter } from 'node:events';
import { watch, type FSWatcher } from 'chokidar';
import { sep } from 'node:path';
import type { FileEvent, FileEventType } from '../../shared/types';

export interface MonorepoWatcherOptions {
  monorepoRoot: string;       // default: C:\dev
  debounceMs?: number;        // default: 250
  ignoreInitial?: boolean;    // default: true
}

const IGNORED_SEGMENTS = /[\\/](?:node_modules|dist|out|\.nx|\.turbo|_backups|\.git|\.vscode|\.idea)(?:[\\/]|$)|[\\/]\.[^\\/]/;

export class MonorepoWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private pending = new Map<string, FileEvent>();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly opts: MonorepoWatcherOptions) {
    super();
  }

  start(): void {
    if (this.watcher) return;
    const { monorepoRoot, ignoreInitial = true } = this.opts;
    const paths = [
      `${monorepoRoot}${sep}apps`,
      `${monorepoRoot}${sep}packages`
    ];
    this.watcher = watch(paths, {
      ignoreInitial,
      persistent: true,
      ignored: (p: string) => {
        if (IGNORED_SEGMENTS.test(p)) return true;
        return false;
      },
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    });

    const handle = (type: FileEventType) => (path: string, stats?: { size: number }) => {
      const ev: FileEvent = {
        type,
        path,
        appName: this.extractName(path, 'apps'),
        packageName: this.extractName(path, 'packages'),
        timestamp: Date.now(),
        sizeBytes: stats?.size
      };
      this.pending.set(path + ':' + type, ev);
      this.scheduleFlush();
    };

    this.watcher
      .on('add', handle('add'))
      .on('change', handle('change'))
      .on('unlink', handle('unlink'))
      .on('addDir', handle('addDir'))
      .on('unlinkDir', handle('unlinkDir'))
      .on('error', (err: unknown) => this.emit('error', err))
      .on('ready', () => this.emit('ready'));
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pending.clear();
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  getWatched(): Record<string, string[]> {
    return this.watcher?.getWatched() ?? {};
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    const delay = this.opts.debounceMs ?? 250;
    this.flushTimer = setTimeout(() => {
      const events = Array.from(this.pending.values());
      this.pending.clear();
      this.flushTimer = null;
      if (events.length > 0) this.emit('events', events);
    }, delay);
  }

  private extractName(path: string, segment: 'apps' | 'packages'): string | null {
    const marker = `${sep}${segment}${sep}`;
    const idx = path.indexOf(marker);
    if (idx === -1) return null;
    const after = path.slice(idx + marker.length);
    const end = after.indexOf(sep);
    return end === -1 ? after : after.slice(0, end);
  }
}
