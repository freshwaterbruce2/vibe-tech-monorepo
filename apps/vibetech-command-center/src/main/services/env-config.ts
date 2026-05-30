import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NxGraph, ProjectEnvInfo } from '../../shared/types';

export class EnvConfigService {
  constructor(private readonly opts: { monorepoRoot: string }) {}

  async listConfigs(graph: NxGraph): Promise<ProjectEnvInfo[]> {
    const projects = Object.values(graph.projects).filter(
      (p) => p.type === 'app'
    );

    return projects.map((p) => this.readProjectEnvInfo(p.name, p.root));
  }

  private isPlaceholderValue(value: string): boolean {
    const v = value.trim();
    if (!v) return true;
    return (
      v === 'placeholder' ||
      v === 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz' ||
      v.startsWith('sk_test_placeholder') ||
      v.includes('YOUR_') ||
      v.includes('INSERT_') ||
      v.includes('<your-') ||
      v.includes('TODO')
    );
  }

  readProjectEnvInfo(projectName: string, relativeRoot: string): ProjectEnvInfo {
    const projectRoot = join(this.opts.monorepoRoot, relativeRoot);
    const envExamplePath = join(projectRoot, '.env.example');
    const envPath = join(projectRoot, '.env');
    const envLocalPath = join(projectRoot, '.env.local');

    const envExampleExists = existsSync(envExamplePath);
    const envExists = existsSync(envPath);
    const envLocalExists = existsSync(envLocalPath);

    const requiredKeys = envExampleExists ? this.parseEnvKeys(envExamplePath) : [];
    const envValues = envExists ? this.parseEnvFile(envPath) : {};
    const envLocalValues = envLocalExists ? this.parseEnvFile(envLocalPath) : {};

    // Combine all unique keys from example, env, and env.local
    const allKeys = Array.from(
      new Set([
        ...requiredKeys,
        ...Object.keys(envValues),
        ...Object.keys(envLocalValues),
      ])
    ).sort();

    const values: ProjectEnvInfo['values'] = {};
    const missingKeys: string[] = [];

    for (const key of allKeys) {
      const envValue = envValues[key] ?? null;
      const envLocalValue = envLocalValues[key] ?? null;
      const resolvedValue = envLocalValue ?? envValue;
      const isPlaceholder = resolvedValue !== null ? this.isPlaceholderValue(resolvedValue) : true;

      values[key] = {
        envValue,
        envLocalValue,
        resolvedValue,
        isPlaceholder,
      };

      if (requiredKeys.includes(key)) {
        if (resolvedValue === null || isPlaceholder) {
          missingKeys.push(key);
        }
      }
    }

    return {
      projectName,
      projectRoot: relativeRoot,
      envExampleExists,
      envExists,
      envLocalExists,
      requiredKeys,
      values,
      missingKeys,
    };
  }

  updateEnvVar(
    relativeRoot: string,
    file: '.env' | '.env.local',
    key: string,
    value: string
  ): void {
    const projectRoot = join(this.opts.monorepoRoot, relativeRoot);
    const filePath = join(projectRoot, file);

    let content = '';
    if (existsSync(filePath)) {
      content = readFileSync(filePath, 'utf8');
    }

    const lines = content.split(/\r?\n/);
    let keyUpdated = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      if (line.trim().startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator > 0) {
        const currentKey = line.slice(0, separator).trim();
        if (currentKey === key) {
          lines[i] = `${key}=${value}`;
          keyUpdated = true;
          break;
        }
      }
    }

    if (!keyUpdated) {
      const lastLine = lines[lines.length - 1];
      if (lastLine !== undefined && lastLine.trim() !== '') {
        lines.push('');
      }
      lines.push(`${key}=${value}`);
    }

    writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  private parseEnvKeys(path: string): string[] {
    const keys: string[] = [];
    try {
      const content = readFileSync(path, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator <= 0) continue;
        const key = trimmed.slice(0, separator).trim();
        if (/^[A-Z0-9_]+$/i.test(key)) {
          keys.push(key);
        }
      }
    } catch {
      // Ignore
    }
    return keys;
  }

  private parseEnvFile(path: string): Record<string, string> {
    const result: Record<string, string> = {};
    try {
      const content = readFileSync(path, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator <= 0) continue;
        const key = trimmed.slice(0, separator).trim();
        const value = this.trimEnvQuotes(trimmed.slice(separator + 1).trim());
        if (/^[A-Z0-9_]+$/i.test(key)) {
          result[key] = value;
        }
      }
    } catch {
      // Ignore
    }
    return result;
  }

  private trimEnvQuotes(value: string): string {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }
}
