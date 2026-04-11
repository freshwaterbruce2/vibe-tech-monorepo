import { differenceInHours, format } from 'date-fns';
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	Info,
	RefreshCw,
	X,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PaymentService } from '../../services/payment';

interface CancellationPolicy {
	type?: string;
	description?: string;
}

interface CancellationFormProps {
	booking: {
		id: string;
		confirmationNumber: string;
		hotelName: string;
		roomType: string;
		checkIn: Date;
		checkOut: Date;
		totalAmount: number;
		currency: string;
		isCancellable: boolean;
		cancellationDeadline?: Date;
		cancellationPolicy: CancellationPolicy;
	};
	paymentDetails?: {
		paymentIntentId: string;
		amount: number;
		currency: string;
		status: string;
	};
	onCancel: (reason: string, refundAmount?: number) => Promise<void>;
	onClose: () => void;
}

export const CancellationForm: React.FC<CancellationFormProps> = ({
	booking,
	// paymentDetails,
	onCancel,
	onClose,
}) => {
	const [cancellationReason, setCancellationReason] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);

	const now = new Date();
	const checkInDate = booking.checkIn;
	const cancellationDeadline = booking.cancellationDeadline || checkInDate;

	const hoursUntilDeadline = differenceInHours(cancellationDeadline, now);
	const hoursUntilCheckIn = differenceInHours(checkInDate, now);

	const isWithinCancellationWindow = now <= cancellationDeadline;
	const canCancel = booking.isCancellable && isWithinCancellationWindow;

	// Calculate refund amount based on cancellation policy
	const calculateRefundAmount = () => {
		if (!canCancel) {
			return 0;
		}

		// const policy = booking.cancellationPolicy || {};
		const { totalAmount } = booking;

		// Free cancellation period (usually 24-48 hours before check-in)
		if (hoursUntilCheckIn >= 24) {
			return totalAmount; // Full refund
		}

		// Partial refund based on policy
		if (hoursUntilCheckIn >= 12) {
			return totalAmount * 0.5; // 50% refund
		}

		// No refund for same-day cancellations
		return 0;
	};

	const refundAmount = calculateRefundAmount();
	const cancellationFee = booking.totalAmount - refundAmount;

	const handleCancelClick = () => {
		setShowConfirmation(true);
	};

	const handleConfirmCancellation = async () => {
		if (!cancellationReason.trim()) {
			toast.error('Please provide a reason for cancellation');
			return;
		}

		try {
			setIsProcessing(true);
			await onCancel(cancellationReason, refundAmount);
		} catch (error) {
			toast.error('Cancellation failed', {
				description:
					error instanceof Error
						? error.message
						: 'Something went wrong while cancelling this booking.',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	if (!canCancel) {
		return (
			<div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
				<div className="text-center">
					<AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-4">
						Cancellation Not Available
					</h2>

					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
						<div className="text-left space-y-2">
							{!booking.isCancellable ? (
								<p className="text-red-700">
									This booking has a non-refundable policy and cannot be
									cancelled.
								</p>
							) : (
								<p className="text-red-700">
									The cancellation deadline has passed. Deadline was:{' '}
									{format(cancellationDeadline, 'PPP p')}
								</p>
							)}
						</div>
					</div>

					<p className="text-gray-600 mb-6">
						For special circumstances, please contact our customer support team
						who may be able to assist you.
					</p>

					<div className="flex gap-4 justify-center">
						<button
							onClick={onClose}
							className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Close
						</button>
						<a
							href="mailto:support@hotelbooking.com"
							className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Contact Support
						</a>
					</div>
				</div>
			</div>
		);
	}

	if (showConfirmation) {
		return (
			<div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
				<div className="text-center mb-6">
					<AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Confirm Cancellation
					</h2>
					<p className="text-gray-600">
						Are you sure you want to cancel this booking?
					</p>
				</div>

				{/* Booking Summary */}
				<div className="bg-gray-50 rounded-lg p-4 mb-6">
					<h3 className="font-medium text-gray-900 mb-2">Booking Details</h3>
					<div className="text-sm text-gray-600 space-y-1">
						<p>
							<strong>Hotel:</strong> {booking.hotelName}
						</p>
						<p>
							<strong>Room:</strong> {booking.roomType}
						</p>
						<p>
							<strong>Dates:</strong> {format(booking.checkIn, 'MMM dd')} -{' '}
							{format(booking.checkOut, 'MMM dd, yyyy')}
						</p>
						<p>
							<strong>Confirmation:</strong> {booking.confirmationNumber}
						</p>
					</div>
				</div>

				{/* Refund Summary */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
					<h3 className="font-medium text-blue-900 mb-3">Refund Summary</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-blue-700">Original Amount:</span>
							<span className="font-medium text-blue-900">
								{PaymentService.formatCurrency(
									booking.totalAmount,
									booking.currency,
								)}
							</span>
						</div>

						{cancellationFee > 0 && (
							<div className="flex justify-between">
								<span className="text-blue-700">Cancellation Fee:</span>
								<span className="font-medium text-red-600">
									-
									{PaymentService.formatCurrency(
										cancellationFee,
										booking.currency,
									)}
								</span>
							</div>
						)}

						<div className="border-t border-blue-200 pt-2">
							<div className="flex justify-between">
								<span className="text-blue-800 font-medium">
									Refund Amount:
								</span>
								<span className="font-bold text-green-600">
									{PaymentService.formatCurrency(
										refundAmount,
										booking.currency,
									)}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Cancellation Reason */}
				<div className="mb-6">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Reason for Cancellation *
					</label>
					<textarea
						value={cancellationReason}
						onChange={(e) => setCancellationReason(e.target.value)}
						placeholder="Please provide a reason for cancellation..."
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						rows={3}
						required
					/>
				</div>

				{/* Processing Info */}
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
					<div className="flex items-start">
						<Info className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" />
						<div className="text-sm text-yellow-700">
							<p className="font-medium mb-1">Refund Processing Information:</p>
							<ul className="list-disc list-inside space-y-1">
								<li>
									Refunds typically take 5-10 business days to appear on your
									statement
								</li>
								<li>
									You will receive an email confirmation once the refund is
									processed
								</li>
								<li>
									The refund will be credited to your original payment method
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-4 justify-center">
					<button
						onClick={() => setShowConfirmation(false)}
						className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						disabled={isProcessing}
					>
						Back
					</button>

					<button
						onClick={handleConfirmCancellation}
						disabled={isProcessing || !cancellationReason.trim()}
						className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
					>
						{isProcessing ? (
							<>
								<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
								Processing...
							</>
						) : (
							<>
								<CheckCircle className="h-4 w-4 mr-2" />
								Confirm Cancellation
							</>
						)}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold text-white">Cancel Booking</h2>
					<button
						onClick={onClose}
						aria-label="Close"
						className="text-white hover:text-red-200 transition-colors"
					>
						<X className="h-6 w-6" aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="p-6">
				{/* Booking Info */}
				<div className="bg-gray-50 rounded-lg p-4 mb-6">
					<h3 className="font-medium text-gray-900 mb-3">
						Booking Information
					</h3>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-gray-600">Hotel</p>
							<p className="font-medium">{booking.hotelName}</p>
						</div>
						<div>
							<p className="text-gray-600">Room Type</p>
							<p className="font-medium">{booking.roomType}</p>
						</div>
						<div>
							<p className="text-gray-600">Check-in</p>
							<p className="font-medium flex items-center">
								<Calendar className="h-4 w-4 mr-1" />
								{format(booking.checkIn, 'MMM dd, yyyy')}
							</p>
						</div>
						<div>
							<p className="text-gray-600">Check-out</p>
							<p className="font-medium flex items-center">
								<Calendar className="h-4 w-4 mr-1" />
								{format(booking.checkOut, 'MMM dd, yyyy')}
							</p>
						</div>
					</div>
				</div>

				{/* Cancellation Policy */}
				<div className="mb-6">
					<h3 className="font-medium text-gray-900 mb-3">
						Cancellation Policy
					</h3>

					<div className="space-y-4">
						{/* Deadline Info */}
						<div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
							<Clock className="h-5 w-5 text-blue-500 mt-0.5" />
							<div className="text-sm">
								<p className="font-medium text-blue-900">
									{hoursUntilDeadline > 0
										? 'Free Cancellation Available'
										: 'Cancellation Deadline Passed'}
								</p>
								<p className="text-blue-700">
									{hoursUntilDeadline > 0
										? 'You have ' +
											`${hoursUntilDeadline} hours` +
											' remaining for free cancellation'
										: `Deadline was ${format(cancellationDeadline, 'PPP')}`}
								</p>
							</div>
						</div>

						{/* Refund Calculation */}
						<div className="p-4 border border-gray-200 rounded-lg">
							<h4 className="font-medium text-gray-900 mb-3 flex items-center">
								<DollarSign className="h-4 w-4 mr-1" />
								Refund Calculation
							</h4>

							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-600">Original Amount:</span>
									<span className="font-medium">
										{PaymentService.formatCurrency(
											booking.totalAmount,
											booking.currency,
										)}
									</span>
								</div>

								{cancellationFee > 0 && (
									<div className="flex justify-between">
										<span className="text-gray-600">Cancellation Fee:</span>
										<span className="font-medium text-red-600">
											-
											{PaymentService.formatCurrency(
												cancellationFee,
												booking.currency,
											)}
										</span>
									</div>
								)}

								<div className="border-t pt-2">
									<div className="flex justify-between">
										<span className="font-medium text-gray-900">
											Refund Amount:
										</span>
										<span className="font-bold text-green-600">
											{PaymentService.formatCurrency(
												refundAmount,
												booking.currency,
											)}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Policy Details */}
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<h4 className="font-medium text-yellow-800 mb-2">
								Important Notes:
							</h4>
							<ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
								<li>Free cancellation up to 24 hours before check-in</li>
								<li>
									50% refund for cancellations 12-24 hours before check-in
								</li>
								<li>No refund for same-day cancellations</li>
								<li>Refunds are processed within 5-10 business days</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Reason Input */}
				<div className="mb-6">
					<label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-2">
						Reason for Cancellation (Optional)
					</label>
					<select
						id="cancellation-reason"
						aria-label="Reason for Cancellation (Optional)"
						value={cancellationReason}
						onChange={(e) => setCancellationReason(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="">Select a reason...</option>
						<option value="change_of_plans">Change of plans</option>
						<option value="emergency">Emergency</option>
						<option value="weather">Weather concerns</option>
						<option value="illness">Illness</option>
						<option value="work">Work commitment</option>
						<option value="better_deal">Found better deal</option>
						<option value="other">Other</option>
					</select>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-4">
					<button
						onClick={onClose}
						className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						Keep Booking
					</button>

					<button
						onClick={handleCancelClick}
						className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						Proceed with Cancellation
					</button>
				</div>
			</div>
		</div>
	);
};
