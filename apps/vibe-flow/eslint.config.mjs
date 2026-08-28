// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'src-tauri/**', 'coverage/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
      'max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    ignores: ['**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
);
