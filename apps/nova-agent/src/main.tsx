// Must run before any module that constructs Zod schemas at import time.
import './zod.config';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

import { AdminProvider } from './context/AdminContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ThemeProvider } from './context/ThemeProvider';

// Surface uncaught startup errors on screen. The release webview has no visible
// console, so a thrown error during module eval or first render would otherwise
// leave the window blank. This renders the error text instead of nothing.
function showFatalError(title: string, detail: string): void {
  const target = document.getElementById('root') ?? document.body;
  target.innerHTML = '';
  const pre = document.createElement('pre');
  pre.style.cssText =
    'white-space:pre-wrap;word-break:break-word;padding:24px;margin:0;height:100vh;overflow:auto;color:#ff6b6b;background:#0d0d1a;font:13px/1.55 ui-monospace,Consolas,monospace';
  pre.textContent = `NOVA failed to start\n\n${title}\n\n${detail}`;
  target.appendChild(pre);
}

window.addEventListener('error', (event) => {
  showFatalError(event.message, event.error?.stack ?? '(no stack)');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { stack?: string } | string | undefined;
  const detail = typeof reason === 'object' && reason?.stack ? reason.stack : String(reason);
  showFatalError('Unhandled promise rejection', detail);
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" enableSystem>
        <AdminProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </AdminProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
