import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { isTauri, createVibeTechBridge } from './services/tauri'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
