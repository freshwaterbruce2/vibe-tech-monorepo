import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/agents/code-reviewer.ts',
    'src/agents/quality-gate.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node22',
  outDir: 'dist',
});
