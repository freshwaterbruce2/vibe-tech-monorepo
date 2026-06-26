import baseConfig from '../../eslint.config.js';
import dependencyChecksModule from '@nx/eslint-plugin/src/rules/dependency-checks.js';

const dependencyChecksRule = dependencyChecksModule.default ?? dependencyChecksModule;

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    plugins: {
      '@nx': {
        rules: {
          'dependency-checks': dependencyChecksRule,
        },
      },
    },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
