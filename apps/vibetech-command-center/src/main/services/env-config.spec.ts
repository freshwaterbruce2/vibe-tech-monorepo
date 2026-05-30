import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { EnvConfigService } from './env-config';
import type { NxGraph } from '../../shared/types';

const tmpRoots: string[] = [];

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'env-config-'));
  tmpRoots.push(root);
  return root;
}

function makeGraph(projectRoot: string): NxGraph {
  return {
    projects: {
      'test-app': {
        name: 'test-app',
        type: 'app',
        root: projectRoot,
        sourceRoot: `${projectRoot}/src`,
        tags: ['scope:web'],
        implicitDependencies: [],
      },
    },
    dependencies: {},
    generatedAt: Date.now(),
  };
}

describe('EnvConfigService', () => {
  afterEach(() => {
    while (tmpRoots.length > 0) {
      rmSync(tmpRoots.pop()!, { recursive: true, force: true });
    }
  });

  it('scans env configuration and identifies placeholder/missing keys', async () => {
    const root = makeTempRoot();
    const appRoot = join(root, 'apps', 'test-app');
    mkdirSync(appRoot, { recursive: true });

    writeFileSync(join(appRoot, '.env.example'), 'PORT=\nDATABASE_URL=\nAPI_SECRET=\n');
    writeFileSync(join(appRoot, '.env'), 'PORT=3000\nDATABASE_URL=postgres://localhost/db\nAPI_SECRET=TODO_CHANGE_ME\n');
    writeFileSync(join(appRoot, '.env.local'), 'PORT=3001\n');

    const service = new EnvConfigService({ monorepoRoot: root });
    const graph = makeGraph('apps/test-app');
    const [info] = await service.listConfigs(graph);

    expect(info).toBeDefined();
    expect(info!.projectName).toBe('test-app');
    expect(info!.envExampleExists).toBe(true);
    expect(info!.envExists).toBe(true);
    expect(info!.envLocalExists).toBe(true);

    // Verify parsed values
    expect(info!.values.PORT).toEqual({
      envValue: '3000',
      envLocalValue: '3001',
      resolvedValue: '3001',
      isPlaceholder: false,
    });
    expect(info!.values.DATABASE_URL).toEqual({
      envValue: 'postgres://localhost/db',
      envLocalValue: null,
      resolvedValue: 'postgres://localhost/db',
      isPlaceholder: false,
    });
    expect(info!.values.API_SECRET).toEqual({
      envValue: 'TODO_CHANGE_ME',
      envLocalValue: null,
      resolvedValue: 'TODO_CHANGE_ME',
      isPlaceholder: true,
    });

    // API_SECRET is required but has placeholder, so it's missing
    expect(info!.missingKeys).toEqual(['API_SECRET']);
  });

  it('updates environment variables successfully', () => {
    const root = makeTempRoot();
    const appRoot = join(root, 'apps', 'test-app');
    mkdirSync(appRoot, { recursive: true });

    writeFileSync(join(appRoot, '.env'), 'PORT=3000\n# Some comment\nDATABASE_URL=postgres://localhost/db\n');

    const service = new EnvConfigService({ monorepoRoot: root });
    service.updateEnvVar('apps/test-app', '.env', 'PORT', '4000');
    service.updateEnvVar('apps/test-app', '.env', 'API_KEY', 'secret123');

    const content = readFileSync(join(appRoot, '.env'), 'utf8');
    expect(content).toContain('PORT=4000');
    expect(content).toContain('API_KEY=secret123');
    expect(content).toContain('DATABASE_URL=postgres://localhost/db');
  });
});
