import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config.js';
import type { RunTrace } from '../types.js';

export class RunTraceRepository {
  public constructor(private readonly root = PATHS.tracesDir) {
    mkdirSync(this.root, { recursive: true });
  }

  public save(trace: RunTrace): string {
    const path = join(this.root, `${trace.id}.json`);
    writeFileSync(path, JSON.stringify(trace, null, 2), 'utf-8');
    return path;
  }

  public get(traceId: string): RunTrace {
    return JSON.parse(readFileSync(join(this.root, `${traceId}.json`), 'utf-8')) as RunTrace;
  }

  public list(): RunTrace[] {
    return readdirSync(this.root)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(readFileSync(join(this.root, name), 'utf-8')) as RunTrace);
  }
}
