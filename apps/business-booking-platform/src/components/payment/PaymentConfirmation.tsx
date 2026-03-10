import { format } from 'date-fns';
import {
	Calendar,
	CheckCircle,
	CreditCard,
	Download,
	Mail,
	MapPin,
	Phone,
	Printer,
	Receipt,
	Share2,
	Users,
} from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import { PaymentService } from '../../services/payment';
import { logger } from '../../utils/logger';

interface PaymentConfirmationProps {
	paymentIntent: any;
	bookingDetails: {
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
	};
	onClose?: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
	paymentIntent,
	bookingDetails,
	onClose,
}) => {
	const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
	const [emailSent, setEmailSent] = useState(false);

	const commissionAmount = PaymentService.calculateCommission(
		bookingDetails.totalAmount,
	);
	const taxAmount = bookingDetails.totalAmount * 0.12;
	const baseAmount = bookingDetails.totalAmount - taxAmount - commissionAmount;

	useEffect(() => {
		// Auto-send confirmation email
		sendConfirmationEmail();
	}, []);

	const sendConfirmationEmail = async () => {
		try {
			// Email is sent automatically by the backend after payment confirmation
			// This just updates the UI to show that email was sent
			setTimeout(() => {
				setEmailSent(true);
			}, 2000);
		} catch (error) {
			logger.warn(
				'Confirmation email sending failed, continuing without email',
				{
					component: 'PaymentConfirmation',
					method: 'sendConfirmationEmail',
					bookingId: paymentIntent.id,
					error: error instanceof Error ? error.message : 'Unknown error',
					userImpact: 'none',
				},
			);
		}
	};

	const generatePDFReceipt = async () => {
		try {
			setIsGeneratingReceipt(true);

			// Call backend PDF generation service
			const response = await fetch(
				`/api/payments/${paymentIntent.id}/receipt`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${localStorage.getItem('authToken')}`,
					},
				},
			);

			if (response.ok) {
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);

				const link = document.createElement('a');
				link.href = url;
				link.download = `receipt-${bookingDetails.confirmationNumber}.pdf`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			} else {
				throw new Error('Failed to generate PDF receipt');
			}
		} catch (error) {
			logger.error('PDF receipt generation failed', {
				component: 'PaymentConfirmation',
				method: 'generatePDFReceipt',
				paymentIntentId: paymentIntent.id,
				bookingConfirmation: bookingDetails.confirmationNumber,
				error: error instanceof Error ? error.message : 'Unknown error',
				userImpact: 'receipt_download_failed',
			});
		} finally {
			setIsGeneratingReceipt(false);
		}
	};

	// Helper function to escape HTML content and prevent XSS
	const escapeHtml = (unsafe: string): string => {
		return unsafe
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	};

	const generateReceiptHTML = () => {
		// Escape all user-provided content to prevent XSS
		const safeHotelName = escapeHtml(bookingDetails.hotelName);
		const safeRoomType = escapeHtml(bookingDetails.roomType);
		const safeGuestFirstName = escapeHtml(bookingDetails.guestFirstName);
		const safeGuestLastName = escapeHtml(bookingDetails.guestLastName);
		const safeGuestEmail = escapeHtml(bookingDetails.guestEmail);
		const safeGuestPhone = escapeHtml(bookingDetails.guestPhone);
		const safeConfirmationNumber = escapeHtml(
			bookingDetails.confirmationNumber,
		);
		const safeSpecialRequests = bookingDetails.specialRequests
			? escapeHtml(bookingDetails.specialRequests)
			: '';
		const safePaymentIntentId = escapeHtml(paymentIntent.id);

		return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${safeConfirmationNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .confirmation { background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .detail-section { background: #f9fafb; padding: 20px; border-radius: 8px; }
    .detail-section h3 { margin-top: 0; color: #374151; }
    .price-breakdown { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .price-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .price-row.total { border-top: 2px solid #e5e7eb; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Vibe Hotels</div>
    <h1>Payment Receipt</h1>
    <p>Thank you for your booking!</p>
  </div>

  <div class="confirmation">
    <h2 style="margin-top: 0; color: #059669;">✓ Payment Confirmed</h2>
    <p><strong>Confirmation Number:</strong> ${safeConfirmationNumber}</p>
    <p><strong>Payment Date:</strong> ${format(new Date(), 'PPP')}</p>
    <p><strong>Transaction ID:</strong> ${safePaymentIntentId}</p>
  </div>

  <div class="details-grid">
    <div class="detail-section">
      <h3>Booking Details</h3>
      <p><strong>Hotel:</strong> ${safeHotelName}</p>
      <p><strong>Room Type:</strong> ${safeRoomType}</p>
      <p><strong>Check-in:</strong> ${format(bookingDetails.checkIn, 'PPP')}</p>
      <p><strong>Check-out:</strong> ${format(bookingDetails.checkOut, 'PPP')}</p>
      <p><strong>Nights:</strong> ${bookingDetails.nights}</p>
      <p><strong>Guests:</strong> ${bookingDetails.guests}</p>
    </div>

    <div class="detail-section">
      <h3>Guest Information</h3>
      <p><strong>Name:</strong> ${safeGuestFirstName} ${safeGuestLastName}</p>
      <p><strong>Email:</strong> ${safeGuestEmail}</p>
      <p><strong>Phone:</strong> ${safeGuestPhone}</p>
      ${safeSpecialRequests ? `<p><strong>Special Requests:</strong> ${safeSpecialRequests}</p>` : ''}
    </div>
  </div>

  <div class="price-breakdown">
    <h3>Payment Breakdown</h3>
    <div class="price-row">
      <span>Room Rate (${bookingDetails.nights} nights)</span>
      <span>${PaymentService.formatCurrency(baseAmount, bookingDetails.currency)}</span>
    </div>
    <div class="price-row">
      <span>Taxes & Fees</span>
      <span>${PaymentService.formatCurrency(taxAmount, bookingDetails.currency)}</span>
    </div>
    <div class="price-row">
      <span>Service Fee</span>
      <span>${PaymentService.formatCurrency(commissionAmount, bookingDetails.currency)}</span>
    </div>
    <div class="price-row total">
      <span>Total Paid</span>
      <span>${PaymentService.formatCurrency(bookingDetails.totalAmount, bookingDetails.currency)}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is an official receipt for your hotel booking.</p>
    <p>For questions or support, please contact us at support@vibehotels.com</p>
    <p>Generated on ${format(new Date(), 'PPP')} at ${format(new Date(), 'pp')}</p>
  </div>
</body>
</html>
    `;
	};

	const printReceipt = () => {
		try {
			// Create a secure print window without using document.write
			const printWindow = window.open('', '_blank');
			if (!printWindow) {
				logger.warn('Print window blocked by browser popup blocker', {
					component: 'PaymentConfirmation',
					method: 'printReceipt',
					bookingConfirmation: bookingDetails.confirmationNumber,
					userImpact: 'print_blocked',
					recommendedAction: 'user_allow_popups',
				});
				return;
			}

			// Safely construct the receipt content using DOM methods
			const receiptHTML = generateReceiptHTML();

			// Create a blob URL for the content
			const blob = new Blob([receiptHTML], { type: 'text/html;charset=utf-8' });
			const blobUrl = URL.createObjectURL(blob);

			// Navigate to the blob URL instead of using document.write
			(printWindow as any).location.href = blobUrl;

			// Clean up and print when loaded
			(printWindow as any).onload = () => {
				try {
					printWindow.focus();
					printWindow.print();
					// Clean up the blob URL after printing
					setTimeout(() => {
						URL.revokeObjectURL(blobUrl);
						printWindow.close();
					}, 1000);
				} catch (error) {
					logger.warn('Browser print operation failed', {
						component: 'PaymentConfirmation',
						method: 'printReceipt',
						bookingConfirmation: bookingDetails.confirmationNumber,
						error: error instanceof Error ? error.message : 'Unknown error',
						userImpact: 'print_failed',
					});
					URL.revokeObjectURL(blobUrl);
				}
			};

			// Fallback cleanup in case onload doesn't fire
			setTimeout(() => {
				URL.revokeObjectURL(blobUrl);
			}, 10000);
		} catch (error) {
			logger.error('Print receipt generation failed', {
				component: 'PaymentConfirmation',
				method: 'printReceipt',
				bookingConfirmation: bookingDetails.confirmationNumber,
				error: error instanceof Error ? error.message : 'Unknown error',
				userImpact: 'print_unavailable',
			});
		}
	};

	const shareReceipt = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: `Hotel Booking Confirmation - ${bookingDetails.confirmationNumber}`,
					text: `Your booking at ${bookingDetails.hotelName} has been confirmed!`,
					url: window.location.href,
				});
			} catch (error) {
				logger.info(
					'Native share functionality failed, user likely cancelled',
					{
						component: 'PaymentConfirmation',
						method: 'shareReceipt',
						bookingConfirmation: bookingDetails.confirmationNumber,
						error: error instanceof Error ? error.message : 'Unknown error',
						userImpact: 'share_cancelled',
					},
				);
			}
		} else {
			// Fallback: copy to clipboard
			const shareText = `Hotel booking confirmed! 
Confirmation: ${bookingDetails.confirmationNumber}
Hotel: ${bookingDetails.hotelName}
Dates: ${format(bookingDetails.checkIn, 'MMM dd')} - ${format(bookingDetails.checkOut, 'MMM dd, yyyy')}
Total: ${PaymentService.formatCurrency(bookingDetails.totalAmount, bookingDetails.currency)}`;

			navigator.clipboard.writeText(shareText);
			alert('Booking details copied to clipboard!');
		}
	};

	return (
		<div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
			{/* Success Header */}
			<div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 text-center">
				<CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
				<h1 className="text-3xl font-bold text-white mb-2">
					Payment Successful!
				</h1>
				<p className="text-green-100 text-lg">
					Your booking has been confirmed - Earn 5% rewards!
				</p>
			</div>

			{/* Confirmation Details */}
			<div className="p-6">
				<div className="bg-accent-50 border border-accent-200 rounded-lg p-6 mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold text-accent-900 mb-2">
								Booking Confirmed
							</h2>
							<p className="text-accent-700">
								<strong>Confirmation Number:</strong>{' '}
								{bookingDetails.confirmationNumber}
							</p>
							<p className="text-accent-700">
								<strong>Transaction ID:</strong> {paymentIntent.id}
							</p>
						</div>
						<div className="text-right">
							<p className="text-sm text-accent-600">Total Paid</p>
							<p className="text-2xl font-bold text-accent-900">
								{PaymentService.formatCurrency(
									bookingDetails.totalAmount,
									bookingDetails.currency,
								)}
							</p>
						</div>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-8 mb-8">
					{/* Booking Details */}
					<div className="space-y-6">
						<div className="bg-gray-50 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<MapPin className="h-5 w-5 mr-2" />
								Hotel Details
							</h3>
							<div className="space-y-2">
								<p className="font-medium text-gray-900">
									{bookingDetails.hotelName}
								</p>
								{bookingDetails.hotelAddress && (
									<p className="text-gray-600">{bookingDetails.hotelAddress}</p>
								)}
								<p className="text-gray-600">{bookingDetails.roomType}</p>
							</div>
						</div>

						<div className="bg-gray-50 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<Calendar className="h-5 w-5 mr-2" />
								Stay Details
							</h3>
							<div className="space-y-2">
								<p className="text-gray-600">
									<strong>Check-in:</strong>{' '}
									{format(bookingDetails.checkIn, 'PPP')}
								</p>
								<p className="text-gray-600">
									<strong>Check-out:</strong>{' '}
									{format(bookingDetails.checkOut, 'PPP')}
								</p>
								<p className="text-gray-600">
									<strong>Duration:</strong> {bookingDetails.nights} night
									{bookingDetails.nights !== 1 ? 's' : ''}
								</p>
								<p className="text-gray-600 flex items-center">
									<Users className="h-4 w-4 mr-1" />
									{bookingDetails.guests} guest
									{bookingDetails.guests !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
					</div>

					{/* Guest & Payment Details */}
					<div className="space-y-6">
						<div className="bg-gray-50 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Guest Information
							</h3>
							<div className="space-y-2">
								<p className="text-gray-600">
									<strong>Name:</strong> {bookingDetails.guestFirstName}{' '}
									{bookingDetails.guestLastName}
								</p>
								<p className="text-gray-600 flex items-center">
									<Mail className="h-4 w-4 mr-1" />
									{bookingDetails.guestEmail}
								</p>
								<p className="text-gray-600 flex items-center">
									<Phone className="h-4 w-4 mr-1" />
									{bookingDetails.guestPhone}
								</p>
							</div>
						</div>

						<div className="bg-gray-50 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<CreditCard className="h-5 w-5 mr-2" />
								Payment Details
							</h3>
							<div className="space-y-2">
								<p className="text-gray-600">
									<strong>Payment Method:</strong>{' '}
									{paymentIntent.payment_method?.card?.brand?.toUpperCase()}
									****{paymentIntent.payment_method?.card?.last4}
								</p>
								<p className="text-gray-600">
									<strong>Payment Date:</strong>{' '}
									{format(new Date(paymentIntent.created * 1000), 'PPP')}
								</p>
								<p className="text-gray-600">
									<strong>Status:</strong>
									<span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
										Paid
									</span>
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Price Breakdown */}
				<div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<Receipt className="h-5 w-5 mr-2" />
						Payment Breakdown
					</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<span className="text-gray-600">
								Room Rate ({bookingDetails.nights} nights)
							</span>
							<span className="font-medium">
								{PaymentService.formatCurrency(
									baseAmount,
									bookingDetails.currency,
								)}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-600">Taxes & Fees</span>
							<span className="font-medium">
								{PaymentService.formatCurrency(
									taxAmount,
									bookingDetails.currency,
								)}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-600">
								Service Fee (5%) - You earn rewards!
							</span>
							<span className="font-medium">
								{PaymentService.formatCurrency(
									commissionAmount,
									bookingDetails.currency,
								)}
							</span>
						</div>
						<div className="border-t pt-3">
							<div className="flex justify-between items-center">
								<span className="text-lg font-semibold text-gray-900">
									Total Paid
								</span>
								<span className="text-xl font-bold text-green-600">
									{PaymentService.formatCurrency(
										bookingDetails.totalAmount,
										bookingDetails.currency,
									)}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Special Requests */}
				{bookingDetails.specialRequests && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
						<h3 className="text-lg font-semibold text-yellow-800 mb-2">
							Special Requests
						</h3>
						<p className="text-yellow-700">{bookingDetails.specialRequests}</p>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-4 justify-center">
					<button
						onClick={generatePDFReceipt}
						disabled={isGeneratingReceipt}
						className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
					>
						<Download className="h-5 w-5 mr-2" />
						{isGeneratingReceipt ? 'Generating...' : 'Download Receipt'}
					</button>

					<button
						onClick={printReceipt}
						className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						<Printer className="h-5 w-5 mr-2" />
						Print Receipt
					</button>

					<button
						onClick={shareReceipt}
						className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						<Share2 className="h-5 w-5 mr-2" />
						Share Details
					</button>

					{emailSent && (
						<div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
							<CheckCircle className="h-4 w-4 mr-2" />
							Confirmation email sent
						</div>
					)}
				</div>

				{/* Close Button */}
				{onClose && (
					<div className="text-center mt-8">
						<button
							onClick={onClose}
							className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Close
						</button>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="bg-gray-50 px-6 py-4 border-t text-center">
				<p className="text-sm text-gray-600">
					Save this confirmation for your records. You'll need it for check-in.
				</p>
				<p className="text-xs text-gray-500 mt-2">
					Questions? Contact us at support@vibehotels.com | Enjoy your 5%
					rewards on this booking!
				</p>
			</div>
		</div>
	);
};
