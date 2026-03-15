import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
// Note: This component appears to be for Stripe integration but the project uses Square
// Consider removing this component or implementing Square payment instead
// import {
//   PaymentElement,
//   useStripe,
//   useElements,
// } from '@stripe/react-stripe-js';
import { PaymentService } from '../../services/payment';

type PaymentIntentResult = Awaited<
	ReturnType<typeof PaymentService.createPaymentIntent>
>;

interface PaymentElementFormProps {
	bookingId: string;
	amount: number;
	currency: string;
	onSuccess: (paymentIntent: PaymentIntentResult) => void;
	onError: (error: string) => void;
	billingDetails?: {
		name: string;
		email: string;
		phone?: string;
		address?: {
			line1: string;
			city: string;
			state: string;
			postal_code: string;
			country: string;
		};
	};
}

export const PaymentElementForm: React.FC<PaymentElementFormProps> = ({
	bookingId,
	amount,
	currency,
	onError,
	billingDetails = {
		name: 'John Doe',
		email: 'john@example.com',
	},
}) => {
	// const stripe = useStripe();
	// const elements = useElements();

	const [clientSecret, setClientSecret] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const [error, setError] = useState<string>('');
	const [paymentIntent, setPaymentIntent] =
		useState<PaymentIntentResult | null>(null);

	// Initialize payment intent
	useEffect(() => {
		let isMounted = true;

		const initializePayment = async () => {
			try {
				setIsInitializing(true);
				setError('');

				const result = await PaymentService.createPaymentIntent({
					bookingId,
					amount,
					currency,
					metadata: {
						guestName: billingDetails.name,
						guestEmail: billingDetails.email,
					},
				});

				if (isMounted) {
					setClientSecret(result.clientSecret);
					setPaymentIntent(result);
				}
			} catch (err) {
				if (isMounted) {
					const errorMessage =
						err instanceof Error ? err.message : 'Failed to initialize payment';
					setError(errorMessage);
					onError(errorMessage);
				}
			} finally {
				if (isMounted) {
					setIsInitializing(false);
				}
			}
		};

		if (bookingId && amount > 0) {
			initializePayment();
		}

		return () => {
			isMounted = false;
		};
	}, [
		bookingId,
		amount,
		currency,
		billingDetails.name,
		billingDetails.email,
		onError,
	]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		// TODO: Replace with Square payment integration
		// if (!stripe || !elements || !clientSecret) {
		if (!clientSecret) {
			setError('Payment system not ready. Please try again.');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			// TODO: Replace with Square payment confirmation
			// const { error: submitError } = await elements.submit();

			// if (submitError) {
			//   throw new Error(submitError.message || 'Payment validation failed');
			// }

			// const { error: confirmError, paymentIntent: confirmedPayment } = await stripe.confirmPayment({
			//   elements,
			//   clientSecret,
			//   confirmParams: {
			//     return_url: `${window.location.origin}/payment/success`,
			//     payment_method_data: {
			//       billing_details: {
			//         name: billingDetails.name,
			//         email: billingDetails.email,
			//         phone: billingDetails.phone,
			//         address: billingDetails.address,
			//       },
			//     },
			//   },
			//   redirect: 'if_required',
			// });

			// TODO: Implement Square payment processing here
			throw new Error(
				'Stripe payment integration not implemented. Please use Square payment instead.',
			);

			// if (confirmError) {
			//   throw new Error(confirmError.message || 'Payment confirmation failed');
			// }

			// if (confirmedPayment && confirmedPayment.status === 'succeeded') {
			//   onSuccess(confirmedPayment);
			// } else if (confirmedPayment && confirmedPayment.status === 'requires_action') {
			//   // Handle 3D Secure or other authentication
			//   setError('Additional authentication required. Please complete the verification.');
			// } else {
			//   throw new Error('Payment was not completed successfully');
			// }
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Payment failed';
			setError(errorMessage);
			onError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	if (isInitializing) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
				<span className="ml-2 text-gray-600">Setting up payment...</span>
			</div>
		);
	}

	if (error && !clientSecret) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4">
				<div className="flex items-center">
					<AlertCircle className="h-5 w-5 text-red-400 mr-2" />
					<div>
						<h3 className="text-sm font-medium text-red-800">
							Payment Setup Error
						</h3>
						<p className="mt-1 text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Payment Element */}
			{clientSecret && (
				<div className="border border-gray-200 rounded-lg p-4">
					{/* TODO: Replace with Square payment form */}
					<div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
						<p className="text-yellow-800">
							Stripe payment form not implemented. Please use Square payment
							instead.
						</p>
					</div>
					{/* <PaymentElement
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  name: billingDetails.name,
                  email: billingDetails.email,
                  phone: billingDetails.phone,
                  address: billingDetails.address,
                },
              },
            }}
          /> */}
				</div>
			)}

			{/* Error Display */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<div className="flex items-center">
						<AlertCircle className="h-5 w-5 text-red-400 mr-2" />
						<div>
							<p className="text-sm text-red-700">{error}</p>
						</div>
					</div>
				</div>
			)}

			{/* Payment Summary */}
			{paymentIntent && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-blue-800">Total Amount</p>
							<p className="text-lg font-bold text-blue-900">
								{PaymentService.formatCurrency(
									amount,
									currency,
								)}
							</p>
						</div>
						<div className="text-right">
							<p className="text-xs text-blue-600">Platform Fee (5%)</p>
							<p className="text-sm font-medium text-blue-700">
								{PaymentService.formatCurrency(
									Math.round(amount * 0.05),
									currency,
								)}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Submit Button */}
			<button
				type="submit"
				disabled={isLoading || !clientSecret}
				className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white transition-colors ${
					isLoading || !clientSecret
						? 'bg-gray-400 cursor-not-allowed'
						: 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
				}`}
			>
				{isLoading ? (
					<>
						<Loader2 className="h-5 w-5 animate-spin mr-2" />
						Processing Payment...
					</>
				) : (
					<>
						<CheckCircle className="h-5 w-5 mr-2" />
						Complete Payment
					</>
				)}
			</button>

			{/* Security Notice */}
			<div className="text-xs text-gray-500 text-center">
				<p>
					Your payment information is encrypted and secure. We do not store your
					card details.
				</p>
			</div>
		</form>
	);
};
