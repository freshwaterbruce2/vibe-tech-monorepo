/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_OPENROUTER_API_KEY?: string
  readonly VITE_VIBE_JUSTICE_API_KEY?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
