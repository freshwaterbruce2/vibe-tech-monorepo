import { loader } from '@monaco-editor/react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
// Import Monaco workers using Vite's ?worker syntax (2025 best practice)
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import App from './App';
import { ProductionErrorBoundary } from './components/ErrorBoundary/ProductionErrorBoundary';
import { logger } from './services/Logger';

import { installTauriShim } from './services/tauriShim';

import './styles/loading.css';
import './index.css';
import './styles/live-editor-stream.css'; // PHASE 7: Live editor streaming styles

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

// Configure Monaco Editor to lazily load from local files instead of CDN (required for Tauri/Electron)
// Uses dynamic import to defer loading the ~3.7MB Monaco core until the editor is actually needed
loader.config({
  'vs/nls': { availableLanguages: { '*': '' } },
});

// Override the default loader to use our local Monaco build instead of CDN
loader.init().then(monaco => {
  logger.debug('✅ Monaco Editor loaded and ready');
  return monaco;
}).catch(err => {
  logger.error('❌ Monaco Editor failed to load:', err);
});

// Use production error boundary (no dynamic imports to avoid blocking)
const ErrorBoundary = ProductionErrorBoundary;

// Initialize the app with error boundary
const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found in DOM!');
}

// Install Tauri shim before rendering (polyfills window.electron in Tauri mode)
// Must complete before render because many components access window.electron synchronously.
// 3-second timeout prevents the app from hanging forever if a plugin import fails.
const shimWithTimeout = Promise.race([
  installTauriShim(),
  new Promise<void>((resolve) => setTimeout(() => {
    console.warn('[TauriShim] Installation timed out after 3s — rendering without shim');
    resolve();
  }, 3000)),
]);

shimWithTimeout.then(() => {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}).catch((err) => {
  console.error('[TauriShim] Fatal error:', err);
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
});
