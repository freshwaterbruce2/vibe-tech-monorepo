import { CreditCard, Loader2, Lock, Shield } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
// Note: This component is for Stripe integration but the project uses Square
// import { Elements } from '@stripe/react-stripe-js';
// import { stripePromise } from '../../services/payment';
// import { PaymentElementForm } from './PaymentElementForm';
import { PaymentSummary } from './PaymentSummary';

interface PaymentIntentSummary {
	id: string;
	clientSecret: string;
}

interface PaymentFormProps {
	bookingId: string;
	amount: number;
	currency?: string;
	onSuccess: (paymentIntent: PaymentIntentSummary) => void;
	onError: (error: string) => void;
	bookingDetails?: {
		hotelName: string;
		roomType: string;
		checkIn: Date;
		checkOut: Date;
		guests: number;
		nights: number;
	};
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

export const PaymentForm: React.FC<PaymentFormProps> = ({
	bookingId: _bookingId,
	amount,
	currency = 'USD',
	bookingDetails,
	billingDetails: _billingDetails,
}) => {
	const [isLoading, setIsLoading] = useState(true);
	const [stripeError] = useState<string | null>(null);

	useEffect(() => {
		// Note: Stripe configuration commented out - using Square instead
		// Check if Stripe is properly configured
		// stripePromise
		//   .then((stripe) => {
		//     if (!stripe) {
		//       setStripeError('Payment system is not properly configured');
		//     }
		//     setIsLoading(false);
		//   })
		//   .catch((error) => {
		//     console.error('Failed to load Stripe:', error);
		//     setStripeError('Failed to load payment system');
		//     setIsLoading(false);
		//   });
		setIsLoading(false); // Temporary fix
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
				<span className="ml-2 text-gray-600">Loading payment system...</span>
			</div>
		);
	}

	if (stripeError) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-6">
				<div className="flex items-center">
					<div className="flex-shrink-0">
						<CreditCard className="h-6 w-6 text-red-400" />
					</div>
					<div className="ml-3">
						<h3 className="text-sm font-medium text-red-800">
							Payment System Error
						</h3>
						<p className="mt-1 text-sm text-red-700">{stripeError}</p>
					</div>
				</div>
			</div>
		);
	}

	// const appearance = {
	//   theme: 'stripe' as const,
	//   variables: {
	//     colorPrimary: '#2563eb',
	//     colorBackground: '#ffffff',
	//     colorText: '#374151',
	//     colorDanger: '#ef4444',
	//     fontFamily: 'Inter, system-ui, sans-serif',
	//     spacingUnit: '4px',
	//     borderRadius: '6px',
	//   },
	//   rules: {
	//     '.Tab': {
	//       border: '1px solid #e5e7eb',
	//       borderRadius: '6px',
	//       padding: '12px',
	//       backgroundColor: '#f9fafb',
	//     },
	//     '.Tab:hover': {
	//       backgroundColor: '#f3f4f6',
	//     },
	//     '.Tab--selected': {
	//       backgroundColor: '#eff6ff',
	//       borderColor: '#2563eb',
	//     },
	//     '.Input': {
	//       border: '1px solid #d1d5db',
	//       borderRadius: '6px',
	//       padding: '12px',
	//       fontSize: '14px',
	//     },
	//     '.Input:focus': {
	//       borderColor: '#2563eb',
	//       boxShadow: '0 0 0 1px #2563eb',
	//     },
	//     '.Label': {
	//       fontSize: '14px',
	//       fontWeight: '500',
	//       color: '#374151',
	//       marginBottom: '6px',
	//     },
	//   },
	// };

	// const options = {
	//   appearance,
	//   loader: 'auto' as const,
	// };

	return (
		<div className="max-w-4xl mx-auto">
			<div className="bg-white rounded-lg shadow-lg overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
					<div className="flex items-center">
						<Shield className="h-6 w-6 text-white mr-3" />
						<div>
							<h2 className="text-xl font-semibold text-white">
								Secure Payment
							</h2>
							<p className="text-blue-100 text-sm">
								Your payment is protected with industry-standard encryption
							</p>
						</div>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-8 p-6">
					{/* Payment Form */}
					<div className="space-y-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Payment Details
							</h3>

							{/* Security badges */}
							<div className="flex items-center space-x-4 mb-6 p-3 bg-gray-50 rounded-lg">
								<Lock className="h-5 w-5 text-green-600" />
								<div className="text-sm text-gray-600">
									<span className="font-medium">SSL Encrypted</span> •
									<span className="ml-1">PCI DSS Compliant</span>
								</div>
							</div>

							{/* TODO: Replace with Square payment integration */}
							<div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
								<p className="text-yellow-800 text-lg font-medium">
									Stripe Elements integration not implemented
								</p>
								<p className="text-yellow-700 mt-2">
									Please use the Square payment integration instead.
								</p>
							</div>
							{/* <Elements stripe={stripePromise} options={options}>
                <PaymentElementForm
                  bookingId={bookingId}
                  amount={amount}
                  currency={currency}
                  onSuccess={onSuccess}
                  onError={onError}
                  billingDetails={billingDetails}
                />
              </Elements> */}
						</div>
					</div>

					{/* Payment Summary */}
					<div>
						<PaymentSummary
							amount={amount}
							currency={currency}
							bookingDetails={bookingDetails}
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="bg-gray-50 px-6 py-4 border-t">
					<div className="flex items-center justify-center text-sm text-gray-500">
						<Shield className="h-4 w-4 mr-2" />
						<span>
							Powered by Stripe • Your payment information is secure and
							encrypted
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
