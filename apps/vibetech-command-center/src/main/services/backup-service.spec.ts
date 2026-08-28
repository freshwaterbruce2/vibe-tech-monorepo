import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackupService } from './backup-service';

describe('BackupService', () => {
  let tmpRoot: string;
  let sourceDir: string;
  let destDir: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-bkp-'));
    sourceDir = join(tmpRoot, 'src-fixture');
    destDir = join(tmpRoot, 'backups');
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(sourceDir, 'a.txt'), 'hello');
    writeFileSync(join(sourceDir, 'b.txt'), 'world');
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('creates a zip for a directory source', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    const result = await svc.createBackup({ sourcePath: sourceDir, label: 'unit-test' });
    expect(result.success).toBe(true);
    expect(existsSync(result.zipPath)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.label).toBe('unit-test');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('sanitizes unsafe label characters', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    const result = await svc.createBackup({ sourcePath: sourceDir, label: 'bad/name; $(whoami)' });
    expect(result.success).toBe(true);
    expect(result.zipPath).not.toContain(';');
    expect(result.zipPath).not.toContain('$');
    expect(result.zipPath).not.toContain('/');
  });

  it('reports error for non-existent source', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    const result = await svc.createBackup({ sourcePath: join(tmpRoot, 'missing') });
    expect(result.success).toBe(false);
    expect(result.error).toBe('source not found');
  });

  it('lists recent backups in reverse chronological order', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    await svc.createBackup({ sourcePath: sourceDir, label: 'first' });
    await new Promise((r) => setTimeout(r, 1100));
    await svc.createBackup({ sourcePath: sourceDir, label: 'second' });

    const log = svc.listRecent(10);
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log[0]!.createdAt).toBeGreaterThanOrEqual(log[1]!.createdAt);
  });

  it('creates destination directory if missing', async () => {
    const svc = new BackupService();
    const nested = join(tmpRoot, 'deep', 'nest', 'backups');
    const result = await svc.createBackup({
      sourcePath: sourceDir,
      destinationDir: nested,
      label: 'nested'
    });
    expect(result.success).toBe(true);
    expect(existsSync(nested)).toBe(true);
  });
});
