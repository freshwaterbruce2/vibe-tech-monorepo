import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Bundle nova-agent RAG source (relative imports) but keep native deps external
  noExternal: [/^\.\.?\//],
  external: [
    '@lancedb/lancedb',
    'better-sqlite3',
    'ts-morph',
  ],
});
