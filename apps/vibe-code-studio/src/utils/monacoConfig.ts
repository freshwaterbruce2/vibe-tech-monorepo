/**
 * Monaco Editor Configuration (Lazy Loaded)
 * This file is imported only when Monaco Editor is actually needed
 *
 * Performance Impact:
 * - Saves ~2.45 MB on initial bundle
 * - Monaco loads only when editor component renders
 */

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Import Monaco workers using Vite's ?worker syntax (2025 best practice)
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import { logger } from '../services/Logger';

let isConfigured = false;

/**
 * Configure Monaco Editor workers and environment
 * This should be called before using Monaco Editor
 * Safe to call multiple times (only configures once)
 */
export function configureMonaco() {
  if (isConfigured) {
    logger.debug('[Monaco] Already configured, skipping');
    return;
  }

  // Configure Monaco Editor workers (MUST be before loader.config)
  self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    }
  };

  // Configure Monaco Editor to use local files instead of CDN (required for Tauri/Electron)
  loader.config({ monaco });

  isConfigured = true;
  logger.info('[Monaco] ✅ Configured with Vite workers (Tauri-compatible mode)');
}

/**
 * Get Monaco instance (for advanced usage)
 * Ensures Monaco is configured before returning
 */
export async function getMonaco() {
  configureMonaco();
  return monaco;
}
