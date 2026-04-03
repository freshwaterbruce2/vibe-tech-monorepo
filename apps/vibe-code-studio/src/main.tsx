import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
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

// Use the locally bundled Monaco instead of CDN (required for Tauri — CSP blocks CDN scripts)
loader.config({ monaco });

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
    console.warn('[TauriShim] Installation timed out after 10s — rendering without shim');
    resolve();
  }, 10000)),
]);

shimWithTimeout.then(() => {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
  (window as any).__APP_MOUNTED__ = true;
}).catch((err) => {
  console.error('[TauriShim] Fatal error:', err);
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
  (window as any).__APP_MOUNTED__ = true;
});
