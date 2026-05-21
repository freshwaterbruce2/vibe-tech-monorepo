'use strict';

const { addProjectConfiguration } = require('@nx/devkit');

function writeLandingProject(tree, options) {
  addProjectConfiguration(tree, options.projectName, {
    root: options.projectRoot,
    sourceRoot: `${options.projectRoot}/src`,
    projectType: 'application',
    implicitDependencies: ['@vibetech/landing'],
    targets: {
      dev: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run dev',
          cwd: options.projectRoot,
        },
      },
      build: {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        outputs: ['{projectRoot}/dist'],
        options: {
          command: 'pnpm run build',
          cwd: options.projectRoot,
        },
      },
      preview: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run preview',
          cwd: options.projectRoot,
        },
      },
      test: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run test',
          cwd: options.projectRoot,
        },
      },
      typecheck: {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        options: {
          command: 'pnpm run typecheck',
          cwd: options.projectRoot,
        },
      },
      lint: {
        executor: 'nx:run-commands',
        options: {
          command: "node ../../node_modules/eslint/bin/eslint.js src vite.config.ts --ext .ts,.tsx",
          cwd: options.projectRoot,
        },
      },
      quality: {},
    },
    tags: options.tags,
  });
}

function writeSaasProject(tree, options) {
  addProjectConfiguration(tree, options.projectName, {
    root: options.projectRoot,
    sourceRoot: `${options.projectRoot}/src`,
    projectType: 'application',
    implicitDependencies: [
      '@vibetech/auth',
      '@vibetech/analytics',
      '@vibetech/ai',
      '@vibetech/billing',
      '@vibetech/email',
      '@vibetech/emails',
      '@vibetech/landing',
      '@vibetech/monetization',
      '@vibetech/payments',
    ],
    targets: {
      dev: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run dev',
          cwd: options.projectRoot,
        },
      },
      build: {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        outputs: ['{projectRoot}/dist'],
        options: {
          command: 'pnpm run build',
          cwd: options.projectRoot,
        },
      },
      preview: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run preview',
          cwd: options.projectRoot,
        },
      },
      'api:dev': {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run dev:api',
          cwd: options.projectRoot,
        },
      },
      'api:build': {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        outputs: ['{projectRoot}/server/dist'],
        options: {
          command: 'pnpm run build:api',
          cwd: options.projectRoot,
        },
      },
      'api:start': {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run start:api',
          cwd: options.projectRoot,
        },
      },
      'ship:check': {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run ship:check',
          cwd: options.projectRoot,
        },
      },
      test: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run test',
          cwd: options.projectRoot,
        },
      },
      typecheck: {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        options: {
          command: 'pnpm run typecheck',
          cwd: options.projectRoot,
        },
      },
      lint: {
        executor: 'nx:run-commands',
        options: {
          command:
            "node ../../node_modules/eslint/bin/eslint.js src server/src vite.config.ts --ext .ts,.tsx --ignore-pattern \"server/src/**/*.test.ts\"",
          cwd: options.projectRoot,
        },
      },
      quality: {},
    },
    tags: options.tags,
  });
}

function writeTauriProject(tree, options) {
  addProjectConfiguration(tree, options.projectName, {
    root: options.projectRoot,
    sourceRoot: `${options.projectRoot}/src`,
    projectType: 'application',
    implicitDependencies: ['@vibetech/billing'],
    targets: {
      dev: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run dev',
          cwd: options.projectRoot,
        },
      },
      'dev:web': {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run dev:web',
          cwd: options.projectRoot,
        },
      },
      build: {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        outputs: ['{projectRoot}/dist'],
        options: {
          command: 'pnpm run build',
          cwd: options.projectRoot,
        },
      },
      'package:check': {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run package:check',
          cwd: options.projectRoot,
        },
      },
      package: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run package',
          cwd: options.projectRoot,
        },
      },
      test: {
        executor: 'nx:run-commands',
        options: {
          command: 'pnpm run test',
          cwd: options.projectRoot,
        },
      },
      typecheck: {
        executor: 'nx:run-commands',
        dependsOn: ['^build'],
        options: {
          command: 'pnpm run typecheck',
          cwd: options.projectRoot,
        },
      },
      lint: {
        executor: 'nx:run-commands',
        options: {
          command: "node ../../node_modules/eslint/bin/eslint.js src vite.config.ts --ext .ts,.tsx",
          cwd: options.projectRoot,
        },
      },
      quality: {},
    },
    tags: options.tags,
  });
}

module.exports = {
  writeLandingProject,
  writeSaasProject,
  writeTauriProject,
};
