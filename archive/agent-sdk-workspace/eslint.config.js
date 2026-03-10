// eslint.config.js for archive/agent-sdk-workspace
// Stand-alone config: does not extend the root because 'archive/' is outside the root's files globs.
import path from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'dist/**'],
  },

  // TypeScript source + test files
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json',
      },
    },
    rules: {
      // Agent/tool code legitimately uses console for output — disable the warning.
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
