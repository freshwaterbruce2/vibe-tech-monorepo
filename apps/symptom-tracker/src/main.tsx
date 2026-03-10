import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './ui/App'
import './ui/styles.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- root element is guaranteed to exist in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
