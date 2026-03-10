// Local ESLint config for vibe-tech-lovable-backend
// Extends the monorepo root config but scopes it to this directory's JS files.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Re-use root config but apply it only to this project's JS files
import rootConfig from '../../../eslint.config.js';

export default [
  ...rootConfig,
  {
    // Explicitly include this project's JS files
    files: ['**/*.js'],
    // Override any ignore patterns that would exclude these files
    ignores: ['node_modules/**', 'dist/**', 'logs/**', 'data/**'],
  },
];
