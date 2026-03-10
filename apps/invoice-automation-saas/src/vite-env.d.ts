/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_STRIPE_PUBLIC_KEY?: string;
	readonly VITE_SENTRY_DSN?: string;
	readonly VITE_GA_TRACKING_ID?: string;
	readonly VITE_MIXPANEL_TOKEN?: string;
	readonly VITE_API_URL?: string;
	readonly VITE_APP_URL?: string;
	readonly VITE_ENABLE_MOCK_API?: string;
	readonly VITE_ENABLE_ANALYTICS?: string;
	readonly VITE_ENABLE_SENTRY?: string;
	readonly VITE_SHOW_PERFORMANCE_MONITOR?: string;
	readonly VITE_SHOW_DEBUG_INFO?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
