// Initialize electron API stub FIRST - must be before any other imports
import './utils/electronInit';

import './styles/theme.css';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import { performanceService } from './services/performanceOptimization';

// Initialize jeep-sqlite for web/mobile SQLite support
jeepSqlite(window);
registerServiceWorker();

// Start performance monitoring (fire-and-forget)
performanceService.initialize();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
