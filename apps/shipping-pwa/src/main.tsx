import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/responsive.css'
// Removed custom service worker registration - using VitePWA instead
// import { registerServiceWorker } from "./utils/registerServiceWorker";
// import PwaWrapper from "./components/pwa/PwaWrapper";

// Initialize Sentry error monitoring asynchronously to reduce initial bundle
const initializeSentry = async () => {
  const { initializeSentry } = await import('./lib/sentry');
  await initializeSentry();
};

// Initialize Sentry in the background
initializeSentry().catch(console.error);

const rootElement = document.getElementById('root')!

// Clear loading screen
rootElement.innerHTML = ''

ReactDOM.createRoot(rootElement).render(<App />)

// Service worker is now handled by VitePWA plugin
// registerServiceWorker();
