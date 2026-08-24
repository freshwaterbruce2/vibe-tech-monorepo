/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Provider keys for the primary AI services are intentionally NOT declared:
  // client code must never read those secrets from import.meta.env. Keys come
  // from the backend proxy (default) or the encrypted SecureApiKeyManager store
  // in direct/BYOK mode. (VITE_DEEPSEEK_API_KEY remains only for the legacy
  // DeepSeekService demo path, pending its migration.)
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_DEEPSEEK_BASE_URL: string;
  readonly VITE_DEMO_MODE: string;
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
  // Wave-2 agent UX gates (docs/RUNTIME_DIAGNOSIS.md): multi-agent Review
  // overlay entry and the legacy BackgroundTaskPanel are opt-in.
  readonly VITE_ENABLE_REVIEW_AGENTS?: string;
  readonly VITE_ENABLE_LEGACY_BACKGROUND_TASK_PANEL?: string;
  // These are inherited from Vite's ImportMetaEnv
  // readonly MODE: string
  // readonly DEV: boolean
  // readonly PROD: boolean
  // readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
