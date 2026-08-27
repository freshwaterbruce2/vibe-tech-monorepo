/**
 * Main-process entry: apply renderer CSP before the rest of the app boots.
 * Kept separate from index.ts so path-policy and legacy index debt stay untouched.
 */
import { app } from 'electron';

import { applyRendererCsp } from './csp';

const isDev = !app.isPackaged;

// Register first so CSP is active before windows open.
void app.whenReady().then(() => {
  applyRendererCsp(isDev);
});

// Load the existing main process (registers its own whenReady work).
void import('./index');
