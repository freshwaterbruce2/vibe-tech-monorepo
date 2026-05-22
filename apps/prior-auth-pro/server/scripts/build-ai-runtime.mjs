import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(scriptPath), '../..');
const workspaceRoot = path.resolve(appRoot, '../..');
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const vitePackageJson = appRequire.resolve('vite/package.json');
const viteRequire = createRequire(vitePackageJson);
const esbuildBin = viteRequire.resolve('esbuild/bin/esbuild');

const builds = [
  {
    name: '@vibetech/monetization',
    entry: 'packages/monetization/src/index.ts',
    outfile: 'packages/monetization/dist/src/index.js',
    declaration: `export type TenantId = string;
export declare function currentTenantId(): TenantId;
`,
  },
  {
    name: '@vibetech/ai',
    entry: 'packages/ai/src/index.ts',
    outfile: 'packages/ai/dist/src/index.js',
    declaration: `export type AiProviderName = 'gemini' | 'openrouter';
export interface AiProvider {
  readonly name: AiProviderName;
  generate(input: unknown): Promise<unknown>;
}
export declare function createFetchGeminiProvider(options: Record<string, unknown>): AiProvider;
export declare function createFetchOpenRouterProvider(options: Record<string, unknown>): AiProvider;
export declare function generateWithMetering(provider: AiProvider, input: unknown): Promise<unknown>;
`,
  },
];

for (const build of builds) {
  const outputPath = path.join(workspaceRoot, build.outfile);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const executable = process.platform === 'win32' ? process.execPath : esbuildBin;
  const args =
    process.platform === 'win32'
      ? [
          esbuildBin,
          build.entry,
          '--bundle',
          '--platform=node',
          '--format=esm',
          '--target=node22',
          `--outfile=${build.outfile}`,
        ]
      : [
          build.entry,
          '--bundle',
          '--platform=node',
          '--format=esm',
          '--target=node22',
          `--outfile=${build.outfile}`,
        ];

  execFileSync(
    executable,
    args,
    {
      cwd: workspaceRoot,
      stdio: 'inherit',
    },
  );

  writeFileSync(outputPath.replace(/\.js$/, '.d.ts'), build.declaration);
  console.warn(`Built ${build.name} runtime bundle`);
}
