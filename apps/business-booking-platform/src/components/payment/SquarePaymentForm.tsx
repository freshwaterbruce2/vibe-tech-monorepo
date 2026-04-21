import {
	AlertCircle,
	CheckCircle,
	CreditCard,
	Loader2,
	Lock,
	Shield,
} from 'lucide-react';
import React from 'react';
import { memo, useCallback, useEffect, useState } from 'react';
import {
	type PaymentRequest,
	squarePaymentManager,
} from '../../services/squarePaymentManager';
import { logger } from '../../utils/logger';
import { paymentConfig } from '../../utils/paymentConfig';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Type reference for Square SDK global types
interface SquareCard {
	attach(selector: string): Promise<void>;
	tokenize(): Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
}

interface SquarePaymentFormProps {
	bookingId: string;
	amount: number;
	currency?: string;
	onSuccess: (paymentResult: {
		paymentId: string;
		receiptUrl?: string;
	}) => void;
	onError: (error: Error) => void;
	bookingDetails?: {
		hotelName: string;
		checkIn: string;
		checkOut: string;
		guests: number;
	};
}

interface BillingInfo {
	firstName: string;
	lastName: string;
	email: string;
	addressLine1: string;
	addressLine2: string;
	locality: string;
	administrativeDistrictLevel1: string;
	postalCode: string;
	country: string;
}

const SquarePaymentForm = memo<SquarePaymentFormProps>(
	({
		bookingId,
		amount,
		currency = 'USD',
		onSuccess,
		onError,
		bookingDetails,
	}) => {
		const [isLoading, setIsLoading] = useState(true);
		const [isProcessing, setIsProcessing] = useState(false);
		const [squareError, setSquareError] = useState<string | null>(null);
		const [paymentSuccess, setPaymentSuccess] = useState(false);
		const [isDemoMode, setIsDemoMode] = useState(false);
		const [card, setCard] = useState<SquareCard | null>(null);
		const [billingInfo, setBillingInfo] = useState<BillingInfo>({
			firstName: '',
			lastName: '',
			email: '',
			addressLine1: '',
			addressLine2: '',
			locality: '',
			administrativeDistrictLevel1: '',
			postalCode: '',
			country: 'US',
		});

		const initializeSquare = useCallback(async () => {
			try {
				setIsLoading(true);
				setSquareError(null);

				// Check if we should use demo mode
				const enableMockPayments =
					import.meta.env.VITE_ENABLE_MOCK_PAYMENTS === 'true';
				const hasRealCredentials =
					paymentConfig.isConfigured() && !paymentConfig.isPlaceholder();

				if (enableMockPayments || !hasRealCredentials) {
					setIsDemoMode(true);
					setIsLoading(false);
					logger.info('Demo payment mode enabled - safe testing environment', {
						component: 'SquarePaymentForm',
					});
					return;
				}

				// Try to initialize real Square Web SDK
				const config = paymentConfig.getConfig();
				if (!config) {
					throw new Error('Square configuration not available');
				}

				// Load Square Web SDK
				if (!window.Square) {
					throw new Error('Square Web SDK not loaded');
				}

				// Initialize Square Web SDK
				const payments = await window.Square.payments(
					config.applicationId,
					config.locationId,
				);

				// Create and configure card element
				const cardElement = await payments.card({
					style: {
						input: {
							fontSize: '16px',
							fontFamily: 'Inter, system-ui, sans-serif',
							color: '#374151',
							lineHeight: '24px',
						},
						'.input-container': {
							borderRadius: '8px',
							borderWidth: '1px',
							borderColor: '#D1D5DB',
							backgroundColor: '#FFFFFF',
						},
						'.input-container.is-focus': {
							borderColor: '#3B82F6',
							boxShadow: '0 0 0 1px #3B82F6',
						},
						'.input-container.is-error': {
							borderColor: '#EF4444',
						},
					},
				});

				await cardElement.attach('#card-container');
				setCard(cardElement);
				setIsDemoMode(false);
				logger.info('Square Web SDK initialized successfully', {
					component: 'SquarePaymentForm',
				});
			} catch (error) {
				logger.warn('Square initialization failed, using demo mode', {
					component: 'SquarePaymentForm',
					error,
				});
				setIsDemoMode(true);
				setSquareError(null); // Clear error since we're falling back to demo
			} finally {
				setIsLoading(false);
			}
		}, []);

		useEffect(() => {
			initializeSquare();
		}, [initializeSquare]);

		const handlePayment = async (e: React.FormEvent) => {
			e.preventDefault();
			setIsProcessing(true);
			setSquareError(null);

			try {
				let sourceId = '';

				// Get payment token if using real Square
				if (!isDemoMode && card) {
					const result = await card.tokenize();
					if (result.status === 'OK' && result.token) {
						sourceId = result.token;
					} else {
						throw new Error(
							result.errors?.[0]?.message || 'Payment tokenization failed',
						);
					}
				}

				// Create payment request
				const paymentRequest: PaymentRequest = {
					sourceId,
					amount,
					currency,
					bookingId,
					billingAddress: {
						firstName: billingInfo.firstName,
						lastName: billingInfo.lastName,
						addressLine1: billingInfo.addressLine1,
						addressLine2: billingInfo.addressLine2,
						locality: billingInfo.locality,
						administrativeDistrictLevel1:
							billingInfo.administrativeDistrictLevel1,
						postalCode: billingInfo.postalCode,
						country: billingInfo.country,
					},
					metadata: {
						email: billingInfo.email,
						customerName: `${billingInfo.firstName} ${billingInfo.lastName}`,
						bookingSource: 'vibe-hotels-website',
					},
				};

				// Validate payment request
				const validation =
					squarePaymentManager.validatePaymentRequest(paymentRequest);
				if (!validation.valid) {
					throw new Error(validation.errors.join(', '));
				}

				// Process payment
				const result =
					await squarePaymentManager.processPayment(paymentRequest);

				if (result.success) {
					setPaymentSuccess(true);

					// Show success message for demo vs real payments
					if (result.isDemoPayment) {
						logger.info('Demo payment completed successfully', {
							component: 'SquarePaymentForm',
							paymentId: result.paymentId,
							amount,
						});
					} else {
						logger.info('Real Square payment completed successfully', {
							component: 'SquarePaymentForm',
							paymentId: result.paymentId,
							amount,
						});
					}

					setTimeout(() => {
						onSuccess({
							paymentId: result.paymentId,
							receiptUrl: result.receiptUrl,
						});
					}, 2000);
				} else {
					throw new Error(result.errorMessage || 'Payment processing failed');
				}
			} catch (error) {
				logger.error('Payment processing error', error, {
					component: 'SquarePaymentForm',
					bookingId,
					amount,
					isDemoMode,
				});
				const errorMessage =
					error instanceof Error ? error.message : 'Payment processing failed';
				setSquareError(errorMessage);
				onError(error instanceof Error ? error : new Error(errorMessage));
			} finally {
				setIsProcessing(false);
			}
		};

		const handleBillingChange = (field: string, value: string) => {
			setBillingInfo((prev) => ({ ...prev, [field]: value }));
		};

		if (isLoading) {
			return (
				<div className="max-w-2xl mx-auto">
					<div className="space-y-6 animate-pulse">
						{/* Payment Status Skeleton */}
						<div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
							<div className="flex items-start">
								<div className="h-5 w-5 bg-gray-300 rounded mr-2 mt-0.5"></div>
								<div className="flex-1">
									<div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
									<div className="h-3 bg-gray-300 rounded w-48"></div>
								</div>
							</div>
						</div>

						{/* Billing Information Skeleton */}
						<div className="space-y-4">
							<div className="h-6 bg-gray-300 rounded w-40"></div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="h-12 bg-gray-300 rounded"></div>
								<div className="h-12 bg-gray-300 rounded"></div>
							</div>
							<div className="h-12 bg-gray-300 rounded"></div>
							<div className="h-12 bg-gray-300 rounded"></div>
							<div className="h-12 bg-gray-300 rounded"></div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="h-12 bg-gray-300 rounded"></div>
								<div className="h-12 bg-gray-300 rounded"></div>
								<div className="h-12 bg-gray-300 rounded"></div>
							</div>
						</div>

						{/* Payment Method Skeleton */}
						<div className="space-y-4">
							<div className="h-6 bg-gray-300 rounded w-36"></div>
							<div className="h-16 bg-gray-300 rounded"></div>
						</div>

						{/* Payment Summary Skeleton */}
						<div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
							<div className="h-5 bg-gray-300 rounded w-32 mb-4"></div>
							<div className="space-y-2">
								<div className="flex justify-between">
									<div className="h-4 bg-gray-300 rounded w-16"></div>
									<div className="h-4 bg-gray-300 rounded w-24"></div>
								</div>
								<div className="flex justify-between">
									<div className="h-4 bg-gray-300 rounded w-20"></div>
									<div className="h-4 bg-gray-300 rounded w-20"></div>
								</div>
								<div className="border-t pt-2">
									<div className="flex justify-between">
										<div className="h-5 bg-gray-300 rounded w-12"></div>
										<div className="h-5 bg-gray-300 rounded w-16"></div>
									</div>
								</div>
							</div>
						</div>

						{/* Submit Button Skeleton */}
						<div className="h-14 bg-gray-300 rounded"></div>

						{/* Loading indicator */}
						<div className="flex items-center justify-center pt-4">
							<Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
							<span className="text-gray-600">
								Loading secure payment form...
							</span>
						</div>
					</div>
				</div>
			);
		}

		if (paymentSuccess) {
			return (
				<div className="max-w-md mx-auto">
					<div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
						<CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-green-900 mb-2">
							Payment Successful!
						</h3>
						<p className="text-green-700">Your booking has been confirmed.</p>
					</div>
				</div>
			);
		}

		const statusMessage = squarePaymentManager.getPaymentStatusMessage(
			isDemoMode,
			import.meta.env.PROD,
		);
		const testCards = squarePaymentManager.getTestCardSuggestions();

		return (
			<div className="max-w-2xl mx-auto">
				<form onSubmit={handlePayment} className="space-y-6">
					{/* Payment Status */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div className="flex items-start">
							<Shield className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
							<div>
								<h3 className="text-sm font-medium text-blue-900 mb-1">
									Payment Security
								</h3>
								<p className="text-sm text-blue-700">{statusMessage}</p>

								{isDemoMode && testCards.length > 0 && (
									<div className="mt-3">
										<p className="text-xs text-blue-600 font-medium mb-2">
											Test Card Numbers:
										</p>
										<div className="space-y-1">
											{testCards.map((testCard, index) => (
												<div key={index} className="text-xs text-blue-600">
													<strong>{testCard.name}:</strong> {testCard.number} -{' '}
													{testCard.description}
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Billing Information */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-gray-900 flex items-center">
							<CreditCard className="h-5 w-5 mr-2" />
							Billing Information
						</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Input
								type="text"
								placeholder="First Name"
								value={billingInfo.firstName}
								onChange={(e) =>
									handleBillingChange('firstName', e.target.value)
								}
								required
								className="w-full"
							/>
							<Input
								type="text"
								placeholder="Last Name"
								value={billingInfo.lastName}
								onChange={(e) =>
									handleBillingChange('lastName', e.target.value)
								}
								required
								className="w-full"
							/>
						</div>

						<Input
							type="email"
							placeholder="Email Address"
							value={billingInfo.email}
							onChange={(e) => handleBillingChange('email', e.target.value)}
							required
							className="w-full"
						/>

						<Input
							type="text"
							placeholder="Street Address"
							value={billingInfo.addressLine1}
							onChange={(e) =>
								handleBillingChange('addressLine1', e.target.value)
							}
							required
							className="w-full"
						/>

						<Input
							type="text"
							placeholder="Apt, Suite, etc. (Optional)"
							value={billingInfo.addressLine2}
							onChange={(e) =>
								handleBillingChange('addressLine2', e.target.value)
							}
							className="w-full"
						/>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Input
								type="text"
								placeholder="City"
								value={billingInfo.locality}
								onChange={(e) =>
									handleBillingChange('locality', e.target.value)
								}
								required
								className="w-full"
							/>
							<Input
								type="text"
								placeholder="State"
								value={billingInfo.administrativeDistrictLevel1}
								onChange={(e) =>
									handleBillingChange(
										'administrativeDistrictLevel1',
										e.target.value,
									)
								}
								required
								className="w-full"
							/>
							<Input
								type="text"
								placeholder="ZIP Code"
								value={billingInfo.postalCode}
								onChange={(e) =>
									handleBillingChange('postalCode', e.target.value)
								}
								required
								className="w-full"
							/>
						</div>
					</div>

					{/* Payment Method */}
					{!isDemoMode && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center">
								<Lock className="h-5 w-5 mr-2" />
								Payment Method
							</h3>
							<div
								id="card-container"
								className="border border-gray-300 rounded-lg p-3 min-h-[50px] bg-white"
								style={{ minHeight: '50px' }}
							/>
						</div>
					)}

					{/* Demo Payment Method */}
					{isDemoMode && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center">
								<Lock className="h-5 w-5 mr-2" />
								Demo Payment Method
							</h3>
							<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
								<p className="text-sm text-gray-600 mb-3">
									Demo mode - no real payment will be processed. All test
									transactions will succeed.
								</p>
								<div className="flex items-center justify-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
									<div className="text-center">
										<CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
										<p className="text-sm text-gray-500">
											Demo Payment Processing
										</p>
										<p className="text-xs text-gray-400">
											Safe testing environment
										</p>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Error Display */}
					{squareError && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<div className="flex items-start">
								<AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
								<div>
									<h4 className="text-sm font-medium text-red-900">
										Payment Error
									</h4>
									<p className="text-sm text-red-700 mt-1">{squareError}</p>
								</div>
							</div>
						</div>
					)}

					{/* Payment Summary */}
					<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<h4 className="text-sm font-semibold text-gray-900 mb-2">
							Payment Summary
						</h4>
						<div className="space-y-2 text-sm">
							{bookingDetails && (
								<>
									<div className="flex justify-between">
										<span className="text-gray-600">Hotel:</span>
										<span className="text-gray-900">
											{bookingDetails.hotelName}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Check-in:</span>
										<span className="text-gray-900">
											{bookingDetails.checkIn}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Check-out:</span>
										<span className="text-gray-900">
											{bookingDetails.checkOut}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Guests:</span>
										<span className="text-gray-900">
											{bookingDetails.guests}
										</span>
									</div>
									<hr className="border-gray-300" />
								</>
							)}
							<div className="flex justify-between font-semibold text-lg">
								<span className="text-gray-900">Total:</span>
								<span className="text-gray-900">
									{squarePaymentManager.formatCurrency(amount, currency)}
								</span>
							</div>
						</div>
					</div>

					{/* Submit Button */}
					<Button
						type="submit"
						disabled={isProcessing}
						className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
					>
						{isProcessing ? (
							<>
								<Loader2 className="h-5 w-5 animate-spin" />
								<span>Processing Payment...</span>
							</>
						) : (
							<>
								<Lock className="h-5 w-5" />
								<span>
									Complete Payment -{' '}
									{squarePaymentManager.formatCurrency(amount, currency)}
								</span>
							</>
						)}
					</Button>
				</form>
			</div>
		);
	},
);

SquarePaymentForm.displayName = 'SquarePaymentForm';

export { SquarePaymentForm };
