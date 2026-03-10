// Square Web SDK / Web Payments minimal ambient types
declare module '@square/web-sdk' {
	export interface TokenResult {
		status: string;
		token?: string;
		errors?: { message: string; code?: string }[];
	}
	export interface Card {
		tokenize(): Promise<TokenResult>;
	}
	export interface Payments {
		card(): Promise<Card>;
	}
}

// Global script-based SDK (window.Square)
interface SquareCardTokenizeResult {
	status: string;
	token?: string;
	errors?: { message: string }[];
}
interface SquareCard {
	attach(selector: string): Promise<void>;
	tokenize(): Promise<SquareCardTokenizeResult>;
}
interface SquarePayments {
	card(options?: Record<string, unknown>): Promise<SquareCard>;
}
interface SquareGlobal {
	payments(appId: string, locationId: string): Promise<SquarePayments>;
}

declare global {
	interface Window {
		Square?: SquareGlobal;
	}
	interface ImportMetaEnv {
		readonly VITE_API_URL?: string;
		readonly VITE_SQUARE_APP_ID?: string;
		readonly VITE_SQUARE_LOCATION_ID?: string;
	}
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
