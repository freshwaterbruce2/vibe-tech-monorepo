import { AlertTriangle, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingService } from '@/domain/booking';
import { PaymentService } from '@/domain/payments';
import { SquarePaymentForm } from '../components/payment/SquarePaymentForm';

interface BookingDetails {
	id: string;
	confirmationNumber: string;
	hotelName: string;
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
	status: string;
	paymentStatus: string;
}

// Raw booking shape returned by BookingService (extend safely with optionals)
interface RawBooking {
	id: string;
	confirmationNumber?: string;
	hotelName: string;
	checkIn: string | Date;
	checkOut: string | Date;
	guests?: number;
	totalAmount: number;
	status: string;
	roomType?: string;
	nights?: number;
	currency?: string;
	guestFirstName?: string;
	guestLastName?: string;
	guestEmail?: string;
	guestPhone?: string;
	paymentStatus?: string;
}

export const PaymentPage: React.FC = () => {
	const { bookingId } = useParams<{ bookingId: string }>();
	const navigate = useNavigate();

	const [booking, setBooking] = useState<BookingDetails | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const [paymentStatus, setPaymentStatus] = useState<
		'idle' | 'processing' | 'success' | 'error'
	>('idle');

	// Legacy Stripe payment_intent URL parameter handling removed.

	const loadBookingDetails = useCallback(async () => {
		try {
			setIsLoading(true);
			if (!bookingId) {
				return;
			}
			const bookingData: RawBooking | null =
				await BookingService.getBooking(bookingId);

			if (!bookingData) {
				throw new Error('Booking not found');
			}

			// Check if booking is payable
			if (!['pending', 'payment_failed'].includes(bookingData.status)) {
				throw new Error(`Booking not payable. Status: ${bookingData.status}`);
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
				status: bookingData.status,
				paymentStatus: bookingData.paymentStatus || 'pending',
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to load booking details';
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [bookingId]);

	// Initial load effect (placed after definition of loadBookingDetails)
	useEffect(() => {
		if (!bookingId) {
			setError('Booking ID is required');
			setIsLoading(false);
			return;
		}
		loadBookingDetails();
	}, [bookingId, loadBookingDetails]);

	const handlePaymentSuccess = async (paymentIntent: {
		paymentId: string;
		receiptUrl?: string;
	}) => {
		try {
			setPaymentStatus('success');

			// Show success message
			toast.success('Payment completed successfully!', {
				description:
					'Your booking has been confirmed. You will receive a confirmation email shortly.',
				duration: 5000,
			});

			// Reload booking to get updated status
			await loadBookingDetails();

			// Redirect to confirmation page after a delay
			setTimeout(() => {
				navigate(`/booking/confirmation/${bookingId}`, {
					state: { paymentIntent },
				});
			}, 3000);
		} catch (error) {
			console.error('Error handling payment success:', error);
			toast.error(
				'Payment completed but there was an issue updating your booking. Please contact support.',
			);
		}
	};

	const handlePaymentError = (error: string) => {
		setPaymentStatus('error');
		toast.error('Payment failed', {
			description: error,
			duration: 10000,
		});
	};

	const handleBackToBooking = () => {
		if (bookingId) {
			navigate(`/booking/${bookingId}`);
		} else {
			navigate('/');
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading booking details...</p>
				</div>
			</div>
		);
	}

	if (error || !booking) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
					<div className="text-center">
						<XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Unable to Load Payment
						</h2>
						<p className="text-gray-600 mb-6">{error}</p>
						<button
							onClick={handleBackToBooking}
							className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go Back
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (paymentStatus === 'success') {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
					<div className="text-center">
						<CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Payment Successful!
						</h2>
						<p className="text-gray-600 mb-2">
							Your booking has been confirmed.
						</p>
						<p className="text-sm text-gray-500 mb-6">
							Confirmation Number:{' '}
							<span className="font-mono font-medium">
								{booking.confirmationNumber}
							</span>
						</p>
						<div className="animate-pulse text-blue-600 text-sm">
							Redirecting to confirmation page...
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (paymentStatus === 'processing') {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
					<div className="text-center">
						<AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Payment Processing
						</h2>
						<p className="text-gray-600 mb-6">
							Your payment is being processed. Please do not refresh this page.
						</p>
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<button
						onClick={handleBackToBooking}
						className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Booking Details
					</button>

					<div className="bg-white rounded-lg shadow-sm p-6">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-2xl font-bold text-gray-900">
									Complete Your Payment
								</h1>
								<p className="text-gray-600 mt-1">
									Booking #{booking.confirmationNumber}
								</p>
							</div>
							<div className="text-right">
								<p className="text-sm text-gray-500">Total Amount</p>
								<p className="text-2xl font-bold text-blue-600">
									{PaymentService.formatCurrency(
										booking.totalAmount,
										booking.currency,
									)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Payment Form (Square only) */}
				<SquarePaymentForm
					bookingId={booking.id}
					amount={booking.totalAmount}
					currency={booking.currency}
					onSuccess={handlePaymentSuccess}
					onError={(e) => handlePaymentError(e.message)}
					bookingDetails={{
						hotelName: booking.hotelName,
						checkIn: booking.checkIn.toISOString(),
						checkOut: booking.checkOut.toISOString(),
						guests: booking.guests,
					}}
				/>
			</div>
		</div>
	);
};
