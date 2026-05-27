import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { initAnalytics } from '@vibetech/analytics';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root was not found');
}

initAnalytics({
  posthogKey: import.meta.env.VITE_POSTHOG_KEY,
  posthogHost: import.meta.env.VITE_POSTHOG_HOST,
});

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
