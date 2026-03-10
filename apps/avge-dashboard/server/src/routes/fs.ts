/**
 * File System Routes
 *
 * Provides read/write access to AVGE project files on D:\avge\.
 * Sandboxed to D:\avge\ — no escaping allowed.
 */

import { Router } from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve } from 'node:path';

export const fsRouter = Router();

const AVGE_ROOT = 'D:\\avge';

/** Validate that a path is under D:\avge\ */
function safePath(requestedPath: string): string | null {
  const resolved = resolve(AVGE_ROOT, normalize(requestedPath));
  if (!resolved.startsWith(AVGE_ROOT)) return null;
  return resolved;
}

/**
 * POST /api/fs/read
 * Body: { path: string } — relative to D:\avge\
 */
fsRouter.post('/read', async (req, res) => {
  const { path } = req.body as { path?: string };
  if (!path) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  const fullPath = safePath(path);
  if (!fullPath) {
    res.status(403).json({ error: 'Path outside sandbox' });
    return;
  }

  try {
    const content = await readFile(fullPath, 'utf-8');
    res.json({ content, path: fullPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOENT')) {
      res.status(404).json({ error: `File not found: ${path}` });
    } else {
      res.status(500).json({ error: msg });
    }
  }
});

/**
 * POST /api/fs/write
 * Body: { path: string, content: string }
 */
fsRouter.post('/write', async (req, res) => {
  const { path, content } = req.body as { path?: string; content?: string };
  if (!path || content === undefined) {
    res.status(400).json({ error: 'Missing path or content' });
    return;
  }

  const fullPath = safePath(path);
  if (!fullPath) {
    res.status(403).json({ error: 'Path outside sandbox' });
    return;
  }

  try {
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
    console.log(`[FS] Wrote ${content.length} chars to ${fullPath}`);
    res.json({ ok: true, path: fullPath, bytes: content.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/fs/list
 * Body: { path: string } — directory relative to D:\avge\
 */
fsRouter.post('/list', async (req, res) => {
  const { path: dirPath } = req.body as { path?: string };
  const target = safePath(dirPath ?? '.');
  if (!target) {
    res.status(403).json({ error: 'Path outside sandbox' });
    return;
  }

  try {
    const { readdir, stat } = await import('node:fs/promises');
    const entries = await readdir(target);
    const items = await Promise.all(
      entries.map(async (name) => {
        const full = resolve(target, name);
        const s = await stat(full);
        return { name, type: s.isDirectory() ? 'dir' : 'file', size: s.size };
      }),
    );
    res.json({ path: target, items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});
