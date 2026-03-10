import { AlertTriangle, Home, Loader2, Mail, Phone } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingService } from '@/domain/booking';
import { PaymentService } from '@/domain/payments';
import { logger } from '@/utils/logger';
import { PaymentConfirmation } from '../components/payment/PaymentConfirmation';

interface BookingDetails {
	id: string;
	confirmationNumber: string;
	hotelName: string;
	hotelAddress?: string;
	roomType: string;
	checkIn: Date;
	checkOut: Date;
	guests: number;
	nights: number;
	totalAmount: number;
	currency: string;
	guestFirstName: string;
	guestLastName: string;
	guestEmail: string;
	guestPhone: string;
	specialRequests?: string;
	status: string;
	paymentStatus: string;
}

export const BookingConfirmationPage: React.FC = () => {
	const { bookingId } = useParams<{ bookingId: string }>();
	const location = useLocation();
	const navigate = useNavigate();

	const [booking, setBooking] = useState<BookingDetails | null>(null);
	const [paymentIntent, setPaymentIntent] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>('');

	// Get payment intent from location state or URL params
	const paymentIntentFromState = location.state?.paymentIntent;

	useEffect(() => {
		if (!bookingId) {
			setError('Booking ID is required');
			setIsLoading(false);
			return;
		}

		loadBookingConfirmation();
	}, [bookingId]);

	interface ApiBooking {
		id: string;
		hotelName: string;
		checkIn: string | Date;
		checkOut: string | Date;
		totalAmount: number;
		status: string;
		confirmationNumber?: string;
		roomType?: string;
		guests?: number;
		nights?: number;
		currency?: string;
		guestFirstName?: string;
		guestLastName?: string;
		guestEmail?: string;
		guestPhone?: string;
		specialRequests?: string;
		paymentStatus?: string;
	}

	const loadBookingConfirmation = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError('');

			// Load booking details
			const id = bookingId || '';
			const bookingData = (await BookingService.getBooking(
				id,
			)) as ApiBooking | null;
			if (!bookingData) {
				throw new Error('Booking not found');
			}

			if (!bookingData) {
				throw new Error('Booking not found');
			}

			// Verify booking is confirmed
			if (bookingData.status !== 'confirmed') {
				throw new Error(
					`Booking is not confirmed. Current status: ${bookingData.status}`,
				);
			}

			setBooking({
				id: bookingData.id,
				confirmationNumber: bookingData.confirmationNumber || bookingData.id,
				hotelName: bookingData.hotelName,
				roomType: bookingData.roomType || 'Standard',
				checkIn: new Date(bookingData.checkIn),
				checkOut: new Date(bookingData.checkOut),
				guests: bookingData.guests || 1,
				nights: bookingData.nights || 1,
				totalAmount: bookingData.totalAmount,
				currency: bookingData.currency || 'USD',
				guestFirstName: bookingData.guestFirstName || 'Guest',
				guestLastName: bookingData.guestLastName || 'User',
				guestEmail: bookingData.guestEmail || '',
				guestPhone: bookingData.guestPhone || '',
				specialRequests: bookingData.specialRequests,
				status: bookingData.status,
				paymentStatus: bookingData.paymentStatus || 'pending',
			});

			// Try to get payment intent details
			if (paymentIntentFromState) {
				setPaymentIntent(paymentIntentFromState);
			} else {
				// Fallback: get payment details from booking payments
				try {
					const bookingPayments = await PaymentService.getBookingPayments(id);
					const successfulPayment = bookingPayments.payments.find(
						(p) => p.status === 'completed',
					);

					if (successfulPayment && successfulPayment.transactionId) {
						const amountNumber =
							typeof successfulPayment.amount === 'string'
								? parseFloat(successfulPayment.amount)
								: (successfulPayment.amount ?? 0);
						const createdAt =
							successfulPayment.createdAt || new Date().toISOString();
						setPaymentIntent({
							id: successfulPayment.transactionId,
							status: 'succeeded',
							amount: Math.round(amountNumber * 100),
							currency: (successfulPayment.currency || 'usd').toLowerCase(),
							created: Math.floor(new Date(createdAt).getTime() / 1000),
							payment_method: {
								card: {
									brand: 'card',
									last4: '****',
								},
							},
						});
					}
				} catch (paymentError) {
					logger.info(
						'Payment details unavailable, continuing without payment info',
						{
							component: 'BookingConfirmationPage',
							method: 'loadBookingDetails',
							bookingId: id,
							error:
								paymentError instanceof Error
									? paymentError.message
									: 'Unknown error',
							userImpact: 'missing_payment_details',
						},
					);
					// Continue without payment details
				}
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: 'Failed to load booking confirmation';
			setError(errorMessage);
			toast.error(errorMessage);

			// Redirect to home after error
			setTimeout(() => {
				navigate('/');
			}, 5000);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		navigate('/bookings');
	};

	const handleGoHome = () => {
		navigate('/');
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Loading Confirmation
					</h2>
					<p className="text-gray-600">Retrieving your booking details...</p>
				</div>
			</div>
		);
	}

	if (error || !booking) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
					<AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-4">
						Unable to Load Confirmation
					</h2>
					<p className="text-gray-600 mb-6">{error}</p>

					<div className="space-y-3">
						<p className="text-sm text-gray-500">
							Redirecting to home page in a few seconds...
						</p>
						<button
							onClick={handleGoHome}
							className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
						>
							<Home className="h-4 w-4 mr-2" />
							Go to Home Page
						</button>
					</div>
				</div>
			</div>
		);
	}

	// If no payment intent available, create a minimal one for display
	const displayPaymentIntent = paymentIntent || {
		id: `confirmation_${booking.confirmationNumber}`,
		status: 'succeeded',
		amount: booking.totalAmount * 100,
		currency: booking.currency.toLowerCase(),
		created: Math.floor(new Date().getTime() / 1000),
		payment_method: {
			card: {
				brand: 'card',
				last4: '****',
			},
		},
	};

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Breadcrumb */}
				<nav className="mb-8">
					<ol className="flex items-center space-x-2 text-sm text-gray-500">
						<li>
							<button
								onClick={handleGoHome}
								className="hover:text-primary transition-colors"
							>
								Home
							</button>
						</li>
						<li>/</li>
						<li>
							<button
								onClick={() => navigate('/bookings')}
								className="hover:text-primary transition-colors"
							>
								My Bookings
							</button>
						</li>
						<li>/</li>
						<li className="text-gray-900">Confirmation</li>
					</ol>
				</nav>

				{/* Main Content */}
				<PaymentConfirmation
					paymentIntent={displayPaymentIntent}
					bookingDetails={booking}
					onClose={handleClose}
				/>

				{/* Additional Information */}
				<div className="mt-12 bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						What's Next?
					</h3>

					<div className="grid md:grid-cols-3 gap-6">
						<div className="text-center">
							<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-blue-600 font-bold text-lg">1</span>
							</div>
							<h4 className="font-medium text-gray-900 mb-2">
								Check Your Email
							</h4>
							<p className="text-sm text-gray-600">
								We've sent a detailed confirmation to {booking.guestEmail}
							</p>
						</div>

						<div className="text-center">
							<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-green-600 font-bold text-lg">2</span>
							</div>
							<h4 className="font-medium text-gray-900 mb-2">
								Prepare for Check-in
							</h4>
							<p className="text-sm text-gray-600">
								Bring a valid ID and this confirmation number:
								<strong>{booking.confirmationNumber}</strong>
							</p>
						</div>

						<div className="text-center">
							<div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-purple-600 font-bold text-lg">3</span>
							</div>
							<h4 className="font-medium text-gray-900 mb-2">
								Enjoy Your Stay
							</h4>
							<p className="text-sm text-gray-600">
								Check-in starts at 3:00 PM on your arrival date
							</p>
						</div>
					</div>
				</div>

				{/* Customer Support */}
				<div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
					<h3 className="text-lg font-semibold text-blue-900 mb-2">
						Need Help?
					</h3>
					<p className="text-blue-700 mb-4">
						Our customer support team is here to assist you 24/7
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<a
							href="mailto:support@hotelbooking.com"
							className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<Mail className="h-4 w-4 mr-2" />
							Email Support
						</a>
						<a
							href="tel:+1-800-HOTELS"
							className="inline-flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
						>
							<Phone className="h-4 w-4 mr-2" />
							Call +1-800-HOTELS
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};
