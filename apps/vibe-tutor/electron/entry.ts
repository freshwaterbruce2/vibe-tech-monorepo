/**
 * Electron entry — applies renderer CSP before the main process boots.
 * Kept separate from main.ts so pre-commit lint does not re-scan legacy debt.
 */
import { app } from 'electron';

import { applyRendererCsp } from './csp';

function isDevMode(): boolean {
  return !app.isPackaged || process.env.NODE_ENV === 'development';
}

// Register first so CSP is active before windows from main.ts open.
void app.whenReady().then(() => {
  applyRendererCsp(isDevMode());
});

// Load the rest of the main process (registers its own whenReady work).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./main');
