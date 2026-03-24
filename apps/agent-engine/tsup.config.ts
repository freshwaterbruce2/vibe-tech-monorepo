import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/agents/orchestrator.ts',
    'src/agents/code-reviewer.ts',
    'src/agents/quality-gate.ts',
    'src/agents/task-runner.ts',
  ],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  shims: true,
  splitting: false,
  treeshake: true,
  target: 'node22',
  outDir: 'dist',
});
