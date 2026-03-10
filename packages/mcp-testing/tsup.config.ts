import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'mocks/index': 'src/mocks/index.ts',
    'helpers/index': 'src/helpers/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,  // Skip DTS for now
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['vitest'],
});
