import baseConfig from '../../../eslint.config.js';

export default [
  ...baseConfig,
  {
    ignores: ['**/*.spec.ts', 'vitest.config.mts'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
