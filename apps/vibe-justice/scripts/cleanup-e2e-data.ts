import { existsSync, rmSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export default function cleanupE2eData() {
  const tempRoot = resolve(tmpdir());
  const configuredRoot = process.env.VIBE_JUSTICE_E2E_RUN_ROOT;
  if (!configuredRoot) return;
  const candidate = resolve(configuredRoot);
  const entry = basename(candidate);
  if (!/^vibe-justice-e2e-[a-f0-9]{32}$/.test(entry)) return;
  if (resolve(candidate, '..') !== tempRoot) return;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    rmSync(candidate, { recursive: true, force: true });
  }
}
