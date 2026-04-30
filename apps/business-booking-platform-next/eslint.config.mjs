import baseConfig from '../../eslint.config.js';

export default [
  {
    ignores: ['backend/**', '**/*.spec.ts', '**/*.spec.tsx'],
  },
  ...baseConfig,
  {
    files: ['apps/business-booking-platform-next/src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'electron-security/no-localstorage-electron': 'off',
    },
  },
];
