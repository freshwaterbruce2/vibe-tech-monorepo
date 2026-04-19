import { spawn } from 'node:child_process';
import { existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { BackupRequest, BackupResult, BackupLogEntry } from '../../shared/types';

export interface BackupServiceOptions {
  defaultDestination?: string;
  powershellPath?: string;
  timeoutMs?: number;
}

const LABEL_SANITIZE = /[^a-zA-Z0-9_\-]/g;

export class BackupService {
  private readonly defaultDest: string;
  private readonly psPath: string;
  private readonly timeoutMs: number;

  constructor(opts: BackupServiceOptions = {}) {
    this.defaultDest = opts.defaultDestination ?? 'C:\\dev\\_backups';
    this.psPath = opts.powershellPath ?? 'pwsh.exe';
    this.timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  }

  async createBackup(req: BackupRequest): Promise<BackupResult> {
    const startedAt = Date.now();
    const source = resolve(req.sourcePath);
    const destDir = resolve(req.destinationDir ?? this.defaultDest);
    const label = req.label ? req.label.replace(LABEL_SANITIZE, '_').slice(0, 48) : null;

    const baseline: BackupResult = {
      success: false,
      zipPath: '',
      sizeBytes: 0,
      sourcePath: source,
      label,
      startedAt,
      completedAt: 0,
      durationMs: 0
    };

    if (!existsSync(source)) {
      return { ...baseline, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: 'source not found' };
    }

    if (!existsSync(destDir)) {
      try { mkdirSync(destDir, { recursive: true }); }
      catch (err) {
        return {
          ...baseline,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt,
          error: `could not create destination: ${(err as Error).message}`
        };
      }
    }

    const stamp = this.timestamp();
    const sourceName = basename(source).replace(LABEL_SANITIZE, '_');
    const parts = [sourceName, label, stamp].filter(Boolean);
    const zipName = `${parts.join('_')}.zip`;
    const zipPath = join(destDir, zipName);

    try {
      await this.runCompressArchive(source, zipPath);
      if (!existsSync(zipPath)) {
        return { ...baseline, zipPath, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: 'zip not produced' };
      }
      const sizeBytes = statSync(zipPath).size;
      const completedAt = Date.now();
      return { success: true, zipPath, sizeBytes, sourcePath: source, label, startedAt, completedAt, durationMs: completedAt - startedAt };
    } catch (err) {
      return { ...baseline, zipPath, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: (err as Error).message };
    }
  }

  listRecent(limit = 20, destinationDir?: string): BackupLogEntry[] {
    const dir = resolve(destinationDir ?? this.defaultDest);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((n) => n.toLowerCase().endsWith('.zip'))
      .map((n) => {
        const full = join(dir, n);
        const st = statSync(full);
        return { zipPath: full, sizeBytes: st.size, createdAt: st.mtimeMs, label: this.labelFromName(n) };
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  private runCompressArchive(source: string, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Argv-based, no shell interpolation. Paths passed via env vars — PowerShell 7 required.
      const args = [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Compress-Archive -Path $env:BKP_SOURCE -DestinationPath $env:BKP_DEST -CompressionLevel Optimal -Force'
      ];
      const proc = spawn(this.psPath, args, {
        shell: false,
        windowsHide: true,
        env: { ...process.env, BKP_SOURCE: source, BKP_DEST: zipPath }
      });
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Compress-Archive timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Compress-Archive exit ${code}: ${stderr.slice(0, 500)}`));
      });
    });
  }

  private timestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  private labelFromName(name: string): string | null {
    const m = name.match(/^(.+?)_(\d{8}_\d{6})\.zip$/);
    if (!m) return null;
    const body = m[1] ?? '';
    const parts = body.split('_');
    return parts.length >= 2 ? parts.slice(1).join('_') : null;
  }
}
