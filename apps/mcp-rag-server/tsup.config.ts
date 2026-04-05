import { resolve } from 'node:path';
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
  // Bundle nova-agent RAG source (cross-project + relative) but keep native deps external
  noExternal: [/^@nova-rag\//, /^\.\.?\//],
  external: [
    '@lancedb/lancedb',
    'better-sqlite3',
    'ts-morph',
  ],
  esbuildOptions(options) {
    options.alias = {
      '@nova-rag': resolve(__dirname, '../nova-agent/src/rag'),
    };
  },
});
