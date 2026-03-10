import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,  // Skip DTS for now to avoid tsconfig issues
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
});
