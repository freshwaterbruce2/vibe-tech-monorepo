import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { isTauri, createVibeTechBridge } from './services/tauri'

// Set up Tauri bridge for window.vibeTech compatibility
if (isTauri()) {
  window.vibeTech = createVibeTechBridge()
} else {
  // Mock for development in browser
  window.vibeTech = {
    searchLogic: async (_snippet: string) => ({
      patterns: [],
      scores: [],
    }),
    onLogicViolation: () => {},
    ping: async () => 'pong',
    getSetting: async () => null,
    setSetting: async () => {},
    onSettingsChanged: () => {},
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
