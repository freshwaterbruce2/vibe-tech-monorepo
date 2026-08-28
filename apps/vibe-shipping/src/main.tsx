import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/responsive.css'
// Initialize Sentry error monitoring asynchronously to reduce initial bundle
const loadAndInitSentry = async () => {
  const { initializeSentry } = await import('./lib/sentry');
  await initializeSentry();
};

// Initialize Sentry in the background
loadAndInitSentry().catch(console.error);

const rootElement = document.getElementById('root')!

// Clear loading screen
rootElement.innerHTML = ''

ReactDOM.createRoot(rootElement).render(<App />)

