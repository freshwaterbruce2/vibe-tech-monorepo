import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node22',
  outDir: 'dist',
  external: ['better-sqlite3', 'sqlite-vec', '@xenova/transformers'],
});
