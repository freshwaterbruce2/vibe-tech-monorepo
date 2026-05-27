import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadLocalEnv(projectRoot = resolveProjectRoot()): void {
  const envFiles = [
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env'),
    path.resolve(projectRoot, '..', '..', '.env'),
  ];

  for (const filePath of envFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (parsed.value.length === 0 || (process.env[parsed.key] !== undefined && process.env[parsed.key] !== '')) {
        continue;
      }
      process.env[parsed.key] = parsed.value;
    }
  }
}

function resolveProjectRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separator = trimmed.indexOf('=');
  if (separator <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separator).trim();
  const value = trimEnvQuotes(trimmed.slice(separator + 1).trim());
  if (!/^[A-Z0-9_]+$/i.test(key)) {
    return null;
  }

  return { key, value };
}

function trimEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
