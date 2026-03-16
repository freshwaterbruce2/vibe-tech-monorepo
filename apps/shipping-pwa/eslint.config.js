import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      'vite.config.ts',
      'server.ts',
      'worker/**',
      'tests/**',
      'android/**',
      'ios/**',
      'shipping-rn/**',
      'ShippingExpo/**',
      'scripts/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // PWA specific globals
        navigator: 'readonly',
        indexedDB: 'readonly',
        SpeechRecognition: 'readonly',
        webkitSpeechRecognition: 'readonly',
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        importScripts: 'readonly',
        // Capacitor globals
        Capacitor: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react-hooks/set-state-in-effect': 'warn',

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',

      // General JavaScript/TypeScript rules
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      eqeqeq: ['error', 'always'],
      'require-yield': 'off',

      // PWA specific rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Performance and best practices
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'consistent-return': 'warn',

      // Downgrade certain errors to warnings for legacy code
      'no-case-declarations': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'no-empty': 'warn',
      'no-empty-pattern': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // === AUDIT RECOMMENDATION: Enforce named imports ===
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message:
                "Use named imports (e.g., import { useState } from 'react') instead of default React import.",
            },
          ],
        },
      ],

      // === AUDIT RECOMMENDATION: Prevent React.FC anti-pattern ===
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "TSTypeReference[typeName.left.name='React'][typeName.right.name='FC']",
          message:
            'Use typed props directly: `({ prop }: Props) => {}` instead of `React.FC<Props>`',
        },
        {
          selector:
            "TSTypeReference[typeName.left.name='React'][typeName.right.name='FunctionComponent']",
          message:
            'Use typed props directly instead of React.FunctionComponent',
        },
      ],
    },
  }
)
