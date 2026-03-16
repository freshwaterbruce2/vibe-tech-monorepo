/**
 * Square Payment Configuration Manager
 * Handles environment-specific Square setup and validation
 */

export interface SquareConfig {
	applicationId: string;
	locationId: string;
	environment: 'sandbox' | 'production';
	isConfigured: boolean;
}

export class PaymentConfigManager {
	private static instance: PaymentConfigManager;
	private config: SquareConfig | null = null;

	private constructor() {
		this.initializeConfig();
	}

	static getInstance(): PaymentConfigManager {
		if (!PaymentConfigManager.instance) {
			PaymentConfigManager.instance = new PaymentConfigManager();
		}
		return PaymentConfigManager.instance;
	}

	private initializeConfig(): void {
		const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
		const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

		if (!applicationId || !locationId) {
			console.warn(
				'Square configuration missing. Payment will run in demo mode.',
			);
			this.config = {
				applicationId: '',
				locationId: '',
				environment: 'sandbox',
				isConfigured: false,
			};
			return;
		}

		// Determine environment based on application ID prefix
		const environment = applicationId.startsWith('sandbox-')
			? 'sandbox'
			: 'production';

		this.config = {
			applicationId,
			locationId,
			environment,
			isConfigured: true,
		};

		// Validate configuration consistency
		this.validateConfig();
	}

	private validateConfig(): void {
		if (!this.config) {
return;
}

		const { applicationId, environment } = this.config;

		// Check if environment matches application ID
		const idEnvironment = applicationId.startsWith('sandbox-')
			? 'sandbox'
			: 'production';
		if (environment !== idEnvironment) {
			console.error(
				"Square configuration mismatch: environment and application ID don't match",
			);
		}

		// Validate ID formats
		if (
			environment === 'sandbox' &&
			!applicationId.startsWith('sandbox-sq0idb-')
		) {
			console.error('Invalid sandbox application ID format');
		}

		if (environment === 'production' && !applicationId.startsWith('sq0idb-')) {
			console.error('Invalid production application ID format');
		}

		// eslint-disable-next-line no-console
		console.info(`Square ${environment} environment configured successfully`);
	}

	getConfig(): SquareConfig | null {
		return this.config;
	}

	isConfigured(): boolean {
		return this.config?.isConfigured ?? false;
	}

	getEnvironment(): 'sandbox' | 'production' | null {
		return this.config?.environment ?? null;
	}

	isPlaceholder(): boolean {
		if (!this.config) {
return true;
}

		return (
			this.config.applicationId.includes('XXXXXXXX') ||
			this.config.locationId.includes('XXXXXXXX') ||
			this.config.applicationId === 'sandbox-sq0idb-XXXXXXXXXXXXXXXXXXXXXXXX' ||
			this.config.locationId === 'LXXXXXXXXXXXXXXXX'
		);
	}

	isProduction(): boolean {
		return this.config?.environment === 'production';
	}

	isSandbox(): boolean {
		return this.config?.environment === 'sandbox';
	}

	/**
	 * Get the appropriate Square Web SDK URL based on environment
	 */
	getSquareSDKUrl(): string {
		const environment = this.getEnvironment();
		return environment === 'production'
			? 'https://web.squarecdn.com/v1/square.js'
			: 'https://sandbox.web.squarecdn.com/v1/square.js';
	}

	/**
	 * Validate that Square Web SDK is properly loaded
	 */
	async validateSDK(): Promise<{ isLoaded: boolean; error?: string }> {
		return new Promise((resolve) => {
			// Check if Square object exists
			if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Square) {
				resolve({ isLoaded: true });
				return;
			}

			// Wait up to 10 seconds for SDK to load
			let attempts = 0;
			const maxAttempts = 50; // 10 seconds with 200ms intervals

			const checkSDK = () => {
				attempts++;

				if ((window as unknown as Record<string, unknown>).Square) {
					resolve({ isLoaded: true });
				} else if (attempts >= maxAttempts) {
					resolve({
						isLoaded: false,
						error:
							'Square Web SDK failed to load. Check your internet connection and Square configuration.',
					});
				} else {
					setTimeout(checkSDK, 200);
				}
			};

			checkSDK();
		});
	}

	/**
	 * Get demo mode message based on configuration status
	 */
	getDemoModeMessage(): string | null {
		if (this.isConfigured()) {
			return null;
		}

		return `Demo payment mode active. To enable real Square payments:
1. Set VITE_SQUARE_APPLICATION_ID in your .env file
2. Set VITE_SQUARE_LOCATION_ID in your .env file
3. Restart the development server`;
	}

	/**
	 * Get environment-specific test card numbers
	 */
	getTestCards(): { name: string; number: string; description: string }[] {
		if (!this.isSandbox()) {
			return [];
		}

		return [
			{
				name: 'Visa Success',
				number: '4111111111111111',
				description: 'Always successful payment',
			},
			{
				name: 'Mastercard Success',
				number: '5555555555554444',
				description: 'Always successful payment',
			},
			{
				name: 'American Express Success',
				number: '378282246310005',
				description: 'Always successful payment',
			},
			{
				name: 'Generic Decline',
				number: '4000000000000002',
				description: 'Always declined',
			},
			{
				name: 'Insufficient Funds',
				number: '4000000000009995',
				description: 'Declined - insufficient funds',
			},
			{
				name: 'Lost Card',
				number: '4000000000009987',
				description: 'Declined - lost card',
			},
		];
	}
}

// Export singleton instance
export const paymentConfig = PaymentConfigManager.getInstance();
