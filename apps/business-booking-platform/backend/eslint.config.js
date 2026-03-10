// Local ESLint config for legacy-booking-backend
// This project pre-dates the strict monorepo rules.
// Note: root eslint.config.js ignores are not always effective when ESLint
// is invoked from this directory — explicit local ignores fix _backups.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Ignore generated/backup/build artifacts
  {
    ignores: [
      'dist/**',
      'coverage/**',
      '**/_backups/**',
      '**/node_modules/**',
    ],
  },

  // JS base rules
  js.configs.recommended,

  // TypeScript source files
  {
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Legacy codebase — systematic violations pre-dating strict rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      'no-console': 'off',
      'no-undef': 'off', // TypeScript handles this

      // Unused imports — auto-fixable (removes entire import lines)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'none', // Never flag catch(error) variables
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
];
