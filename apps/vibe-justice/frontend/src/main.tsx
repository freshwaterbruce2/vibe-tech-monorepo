import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { isTauri, createVibeTechBridge } from './services/tauri'
import { initializeRuntimeAuth } from './services/runtimeAuth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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

initializeRuntimeAuth().then(() => {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')
  ReactDOM.createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
  )
}).catch((error) => {
  console.error('Unable to initialize private backend authentication', error)
  const root = document.getElementById('root')
  if (root) root.textContent = 'Vibe Justice could not initialize its private backend connection.'
})
