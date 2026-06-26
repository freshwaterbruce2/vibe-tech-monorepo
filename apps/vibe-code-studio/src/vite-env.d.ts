/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_DEEPSEEK_BASE_URL: string;
  readonly VITE_DEMO_MODE: string;
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_ANTHROPIC_API_KEY: string;
  readonly REACT_APP_DEEPSEEK_API_KEY?: string;
  readonly REACT_APP_DEEPSEEK_BASE_URL?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_ELECTRON_ENTRY?: string;
  readonly VITE_AI_PROXY_URL?: string;
  readonly VITE_USE_AI_PROXY?: string;
  readonly VITE_ENABLE_TELEMETRY?: string;
  readonly VITE_TELEMETRY_URL?: string;
  readonly VITE_ERROR_REPORTING_URL?: string;
  readonly VITE_ENABLE_CANCEL_LIFECYCLE?: string;
  readonly VITE_ENABLE_CODE_CORRECTION_ROUTE?: string;
  // These are inherited from Vite's ImportMetaEnv
  // readonly MODE: string
  // readonly DEV: boolean
  // readonly PROD: boolean
  // readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
