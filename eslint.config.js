// ESLint Flat Config (ESLint 9+) - Unified Configuration
// Enforces all 24 best practices from learning system analysis
// @see C:\dev\desktop-commander-v2\BEST_PRACTICES_2025_COMPLETE.md

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Custom Electron rules (AST-based, no false positives)
import noLocalStorageElectron from './tools/eslint-rules/no-localstorage-electron.cjs';

export default tseslint.config(
  // Ignore patterns (comprehensive)
  {
    ignores: [
      // Build outputs
      'dist',
      '**/dist/**',
      '**/dist-electron/**',
      '**/out/**',
      'build',
      '**/build/**',
      '.next',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.output/**',
      '.vite-cache/**',
      '**/.vite/**',

      // Dependencies
      'node_modules',
      '**/node_modules/**',
      '.pnpm',

      // Cache & build tools
      '.turbo',
      '**/.turbo/**',
      '.nx',
      '**/.nx/**',
      '**/.cache/**',
      '**/.temp/**',
      '**/.angular/**',

      // IDE & tools
      '.vscode/**',
      '.idea/**',

      // Test coverage
      'coverage/**',
      '**/coverage/**',

      // Generated & static files
      '**/.docusaurus/**',
      '**/public/build/**',
      'public/assets/**',
      '*.min.js',
      '*.bundle.js',
      '**/*.d.ts',

      // Lock files
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',

      // Language-specific
      '**/.venv/**',
      '**/__pycache__/**',
      '**/.pytest_cache/**',
      '**/target/**',

      // Root src folder (Python only - not JS/TS)
      'src/**',

      // Project specific
      'DesktopCommanderMCP/**',
      'Vibe-Tutor/**',
      'opcode/**',
      'edge_extension_deps/**',
      'database-proxy-standalone/**',
      'devworktrees*/**',
      'backups/**',
      'logs/**',
      'playwright-report/**',
      'active-projects/**',
      'projects/**',
      'PowerShell/**',
      'supabase/**',
      'desktop-commander-mcp/**',
      'workflow-hub-mcp/**',
      '**/android/**',
      '**/ios/**',
      '**/_archived/**',
      '**/_backups/**',
      'apps/vibe-code-studio/src/test-setup.ts',
      'apps/vibe-code-studio/src/**/__tests__/**',
      'apps/vibe-code-studio/src/**/*.{test,spec}.{ts,tsx}',
      'apps/vibe-code-studio/src/components/AIProviderSelector/AIProviderSelector.tsx',

      'apps/vibe-code-studio/src/components/ComponentLibrary/index.tsx',
      'apps/vibe-code-studio/src/components/EnhancedAgentMode/EnhancedAgentMode.tsx',
      'apps/vibe-code-studio/src/components/ModelPerformanceDashboard.tsx',
      'apps/vibe-code-studio/src/components/VisualEditor/index.tsx',

      // Orphaned/malformed directories
      'C.devappsaugment-code/**',
      'Cdev.husky/**',
      'Cdev.vscode/**',
      'NVIDIA Corporation/**',
      '%SystemDrive%/**',
      'antigravity-awesome-skills/**',
      'ralph/**',
    ],
  },

  // Base JavaScript configuration
  {
    extends: [js.configs.recommended],
    files: [
      'apps/**/*.{js,mjs,cjs,jsx}',
      'packages/**/*.{js,mjs,cjs,jsx}',
      'backend/**/*.{js,mjs,cjs,jsx}',
    ],
    languageOptions: {
      ecmaVersion: 2025,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2025,
      },
    },
    rules: {
      // ========================================
      // Security Best Practices (0.99 confidence)
      // ========================================

      // Best Practice #2: Never Use eval() (0.99)
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Best Practice #1: XSS Prevention (0.99)
      // Enforced through linting + manual code review
      'no-script-url': 'error',

      // ========================================
      // Modern JavaScript Patterns (0.93-0.98)
      // ========================================

      // Best Practice #19: Const by Default (0.96)
      'prefer-const': 'error',
      'no-var': 'error',

      // Best Practice #20: Immutability (0.93)
      'no-param-reassign': ['warn', { props: true }],

      // Best Practice #17: Optional Chaining (0.98)
      // Note: Enforced by @typescript-eslint in TS files

      // ========================================
      // Code Quality
      // ========================================

      // Clean code practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Best Practice #23: Fail Fast Validation (0.95)
      'consistent-return': 'error',

      // Async/await best practices
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'require-await': 'warn',

      // Modern patterns
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-destructuring': [
        'warn',
        {
          array: false,
          object: true,
        },
      ],

      // Best practices from learning system
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }], // Allow == null (Best Practice #24)
    },
  },

  // TypeScript-specific configuration
  {
    extends: [...tseslint.configs.strict, ...tseslint.configs.stylistic],
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}', 'backend/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2025,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ========================================
      // TypeScript Strict Mode (Best Practices #12-13)
      // ========================================

      // Enforced by tsconfig.json strict flags (relaxed for migration)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',

      // Best Practice #24: Use == null for null checks (0.96)
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off', // Too strict for existing code

      // Best Practice #17-18: Optional chaining & nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // TypeScript code quality
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Best Practice #7: Async/Await Error Handling (0.98)
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/promise-function-async': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'warn',

      // Consistent naming
      '@typescript-eslint/naming-convention': 'off', // Too strict for existing codebase

      // Additional migration-friendly rules (stylistic)
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-generic-constructors': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/prefer-for-of': 'off',

      // Disable buggy rule causing "typeParameters.params is not iterable" error
      '@typescript-eslint/unified-signatures': 'off',

      // === ENFORCE NAMED IMPORTS OVER NAMESPACE ===
      // Use: import { useState, useEffect } from 'react'
      // Not:  import React from 'react'; React.useState()
      '@typescript-eslint/no-namespace': 'error',

      // === PREVENT React.FC PATTERN (anti-pattern in React 18+) ===
      // Use: const Component = ({ prop }: Props) => {}
      // Not:  const Component: React.FC<Props> = ({ prop }) => {}
      // Note: @typescript-eslint/ban-types removed in v8, use no-restricted-syntax instead
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSTypeReference[typeName.left.name="React"][typeName.right.name="FC"]',
          message:
            'Use typed props directly: `({ prop }: Props) => {}` instead of `React.FC<Props>`',
        },
        {
          selector:
            'TSTypeReference[typeName.left.name="React"][typeName.right.name="FunctionComponent"]',
          message: 'Use typed props directly instead of React.FunctionComponent',
        },
      ],
    },
  },

  // React-specific configuration
  {
    files: ['apps/**/*.{jsx,tsx}', 'packages/**/*.{jsx,tsx}', 'apps/nova-mobile-app/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ========================================
      // React 19.2 Best Practices (Best Practices #14-16)
      // ========================================

      // Best Practice #14: React Function Components (0.98)
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],

      // React hooks rules (compatibility with Best Practice #16: useEffectEvent)
      ...reactHooks.configs.recommended.rules,

      // Best Practice #1: XSS Prevention (0.99)
      // Note: React 19 has built-in XSS protection via auto-escaping
      // Additional rules enforced: no-script-url, no-eval

      // React best practices from learning system
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // Best Practice #15: React 19.2 Activity Component
      // (No automatic lint rule - use code review)
    },
  },

  // Security-focused rules for all files
  {
    files: [
      'apps/**/*.{js,mjs,cjs,jsx,ts,tsx}',
      'packages/**/*.{js,mjs,cjs,jsx,ts,tsx}',
      'backend/**/*.{js,mjs,cjs,jsx,ts,tsx}',
    ],
    rules: {
      // ========================================
      // Security Rules (Best Practices #1-6, #27)
      // ========================================

      // Best Practice #3: Environment Variables for Secrets (0.99)
      'no-process-env': 'off', // Allow process.env but watch for hardcoded secrets

      // Best Practice #4: Supply Chain Attack Prevention (0.98)
      // Run `npm audit` separately - no ESLint rule

      // Dangerous patterns
      'no-proto': 'error',
      'no-extend-native': 'error',
      'no-new-wrappers': 'error',
    },
  },

  // Electron-specific security rules (AST-based)
  {
    files: ['apps/**/electron/**/*.{js,ts,jsx,tsx}', 'apps/**/src/**/*.{js,ts,jsx,tsx}'],
    plugins: {
      'electron-security': {
        rules: {
          'no-localstorage-electron': noLocalStorageElectron,
        },
      },
    },
    rules: {
      'electron-security/no-localstorage-electron': 'error',
    },
  },

  // Relaxed rules for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Vibe Tutor - non-null assertions are idiomatic in this codebase
  {
    files: ['apps/vibe-tutor/src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // These projects lint tests and config files that are intentionally excluded
  // from their build-oriented tsconfig.json files.
  {
    files: [
      'packages/shared-ipc/**/*.{ts,tsx}',
      'packages/shared-config/**/*.{ts,tsx}',
      'packages/nova-types/**/*.{ts,tsx}',
      'packages/vibetech-shared/**/*.{ts,tsx}',
      'apps/desktop-commander-v3/**/*.{ts,tsx}',
      'apps/memory-mcp/**/*.{ts,tsx}',
      'apps/vibe-shop/**/*.{ts,tsx}',
      'apps/vibe-code-studio/**/*.{ts,tsx}',
      'apps/cross-agent-reflection/**/*.{ts,tsx}',
      'packages/openrouter-client/**/*.ts',
      'packages/inngest-client/**/*.{ts,tsx}',
      'packages/vibetech-types/**/*.{ts,tsx}',
      'packages/vibetech-hooks/**/*.{ts,tsx}',
      'packages/testing-utils/**/*.{ts,tsx}',
      'packages/service-common/**/*.{ts,tsx}',
      'apps/mcp-skills-server/**/*.{ts,tsx}',
      'apps/workspace-mcp-server/**/*.{ts,tsx}',
      'backend/openrouter-proxy/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: false,
        project: [
          './packages/shared-ipc/tsconfig.lint.json',
          './packages/shared-config/tsconfig.lint.json',
          './packages/nova-types/tsconfig.lint.json',
          './packages/vibetech-shared/tsconfig.lint.json',
          './apps/desktop-commander-v3/tsconfig.lint.json',
          './apps/memory-mcp/tsconfig.lint.json',
          './apps/vibe-shop/tsconfig.lint.json',
          './apps/vibe-code-studio/tsconfig.lint.json',
          './apps/cross-agent-reflection/tsconfig.lint.json',
          './packages/openrouter-client/tsconfig.lint.json',
          './packages/inngest-client/tsconfig.lint.json',
          './packages/vibetech-types/tsconfig.lint.json',
          './packages/vibetech-hooks/tsconfig.lint.json',
          './packages/testing-utils/tsconfig.lint.json',
          './packages/service-common/tsconfig.lint.json',
          './apps/mcp-skills-server/tsconfig.lint.json',
          './apps/workspace-mcp-server/tsconfig.lint.json',
          './backend/openrouter-proxy/tsconfig.lint.json',
        ],
      },
    },
  },

  // Nova-agent test/example files linted outside tsconfig project
  {
    files: [
      'apps/nova-agent/src/**/*.test.{ts,tsx}',
      'apps/nova-agent/src/**/__tests__/**/*.{ts,tsx}',
      'apps/nova-agent/src/test/**/*.ts',
      'apps/nova-agent/src/tests/**/*.ts',
      'apps/nova-agent/src/services/openrouter.example.ts',
    ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: [
            'packages/memory/src/test/setup.ts',
            'packages/memory/src/utils.test.ts',
          ],
        },
      },
    },
  },

  // ipc-bridge: tests are outside the build tsconfig (src/**/* only), use lint tsconfig
  {
    files: ['backend/ipc-bridge/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: false,
        project: ['./backend/ipc-bridge/tsconfig.lint.json'],
      },
    },
  },

  // Archived agent-sdk-workspace — explicit tsconfig needed since projectService
  // doesn't auto-discover tsconfigs outside the monorepo root's project list.
  {
    files: ['archive/agent-sdk-workspace/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['archive/agent-sdk-workspace/tsconfig.json'],
      },
    },
  },

  // Relaxed rules for legacy packages — these projects pre-date the strict rules
  // and have hundreds of systematic any/non-null usages that are too expensive to
  // fix in bulk. New code in these projects still gets IDE warnings.
  {
    files: [
      'apps/desktop-commander-v3/src/**/*.{ts,tsx}',
      'apps/clawdbot-desktop/**/*.{ts,tsx}',
      'packages/vibetech-shared/**/*.{ts,tsx}',
      'apps/invoice-automation-saas/**/*.{ts,tsx}',
      'apps/prompt-engineer/**/*.{ts,tsx}',
      'apps/business-booking-platform/backend/src/**/*.{ts,tsx}',
      'apps/shipping-pwa/src/**/*.{ts,tsx}',
      'apps/nova-mobile-app/src/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'max-len': 'off',
      'consistent-return': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  // Relaxed rules for vibe-code-studio legacy code
  {
    files: ['apps/vibe-code-studio/src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      'no-await-in-loop': 'off',
      'require-await': 'off',
      'no-console': 'off',
      'no-param-reassign': 'off',
      'no-var': 'off',
      'no-restricted-syntax': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  // Relaxed rules for config files
  {
    files: ['*.config.{js,ts,mjs}', '**/vite.config.*', '**/vitest.config.*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
);
