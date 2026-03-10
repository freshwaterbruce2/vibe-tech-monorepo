import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // MCP server doesn't need type declarations
  sourcemap: true,
  clean: true,
  shims: true, // Adds __dirname and __filename shims
  splitting: false,
  treeshake: true,
  target: 'node22',
  outDir: 'dist',
  external: ['@vibetech/memory'],
});
