// Minimal ambient declarations for @square/web-sdk to satisfy TypeScript.
// Extend or replace with official types if package publishes them later.

declare global {
	interface Window {
		Square?: {
			payments(
				appId: string,
				locationId: string,
			): Promise<{
				card(options?: unknown): Promise<{
					attach(selector: string): Promise<void>;
					tokenize(): Promise<{
						status: string;
						token?: string;
						errors?: { message: string }[];
					}>;
				}>;
			}>;
		};
	}
}

export {}; // ensure this file is treated as a module
