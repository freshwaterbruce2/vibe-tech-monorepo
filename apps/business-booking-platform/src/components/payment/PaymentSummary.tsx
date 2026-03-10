import { format } from 'date-fns';
import {
	Building2,
	Calendar,
	CheckCircle,
	Info,
	Receipt,
	Users,
} from 'lucide-react';
import React from 'react';
import { PaymentService } from '../../services/payment';

interface PaymentSummaryProps {
	amount: number;
	currency: string;
	bookingDetails?: {
		hotelName: string;
		roomType: string;
		checkIn: Date;
		checkOut: Date;
		guests: number;
		nights: number;
	};
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
	amount,
	currency,
	bookingDetails,
}) => {
	const commissionAmount = PaymentService.calculateCommission(amount);
	const taxAmount = amount * 0.12; // Assume 12% tax
	const baseAmount = amount - taxAmount - commissionAmount;

	return (
		<div className="space-y-6">
			{/* Booking Details */}
			{bookingDetails && (
				<div className="bg-gray-50 rounded-lg p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<Receipt className="h-5 w-5 mr-2" />
						Booking Summary
					</h3>

					<div className="space-y-4">
						{/* Hotel Information */}
						<div className="flex items-start space-x-3">
							<Building2 className="h-5 w-5 text-gray-400 mt-1" />
							<div>
								<p className="font-medium text-gray-900">
									{bookingDetails.hotelName}
								</p>
								<p className="text-sm text-gray-600">
									{bookingDetails.roomType}
								</p>
							</div>
						</div>

						{/* Dates */}
						<div className="flex items-start space-x-3">
							<Calendar className="h-5 w-5 text-gray-400 mt-1" />
							<div>
								<p className="text-sm font-medium text-gray-900">
									{format(bookingDetails.checkIn, 'MMM dd, yyyy')} -{' '}
									{format(bookingDetails.checkOut, 'MMM dd, yyyy')}
								</p>
								<p className="text-sm text-gray-600">
									{bookingDetails.nights} night
									{bookingDetails.nights !== 1 ? 's' : ''}
								</p>
							</div>
						</div>

						{/* Guests */}
						<div className="flex items-start space-x-3">
							<Users className="h-5 w-5 text-gray-400 mt-1" />
							<div>
								<p className="text-sm font-medium text-gray-900">
									{bookingDetails.guests} guest
									{bookingDetails.guests !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Price Breakdown */}
			<div className="bg-white border rounded-lg p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Price Breakdown
				</h3>

				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<span className="text-gray-600">Room Rate</span>
						<span className="font-medium">
							{PaymentService.formatCurrency(baseAmount, currency)}
						</span>
					</div>

					<div className="flex justify-between items-center">
						<span className="text-gray-600">Taxes & Fees</span>
						<span className="font-medium">
							{PaymentService.formatCurrency(taxAmount, currency)}
						</span>
					</div>

					<div className="flex justify-between items-center">
						<div className="flex items-center">
							<span className="text-gray-600">Service Fee (5%)</span>
							<Info className="h-4 w-4 text-gray-400 ml-1" />
						</div>
						<span className="font-medium">
							{PaymentService.formatCurrency(commissionAmount, currency)}
						</span>
					</div>

					<div className="border-t pt-3">
						<div className="flex justify-between items-center">
							<span className="text-lg font-semibold text-gray-900">Total</span>
							<span className="text-xl font-bold text-blue-600">
								{PaymentService.formatCurrency(amount, currency)}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Security Features */}
			<div className="bg-green-50 border border-green-200 rounded-lg p-4">
				<h4 className="font-medium text-green-800 mb-3 flex items-center">
					<CheckCircle className="h-5 w-5 mr-2" />
					Secure Payment Features
				</h4>

				<ul className="space-y-2 text-sm text-green-700">
					<li className="flex items-center">
						<CheckCircle className="h-4 w-4 mr-2 text-green-500" />
						256-bit SSL encryption
					</li>
					<li className="flex items-center">
						<CheckCircle className="h-4 w-4 mr-2 text-green-500" />
						PCI DSS Level 1 compliant
					</li>
					<li className="flex items-center">
						<CheckCircle className="h-4 w-4 mr-2 text-green-500" />
						3D Secure authentication
					</li>
					<li className="flex items-center">
						<CheckCircle className="h-4 w-4 mr-2 text-green-500" />
						Fraud detection & prevention
					</li>
				</ul>
			</div>

			{/* Cancellation Policy */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h4 className="font-medium text-blue-800 mb-2">Cancellation Policy</h4>
				<p className="text-sm text-blue-700">
					Free cancellation until 24 hours before check-in. Cancel after that
					for a partial refund minus processing fees.
				</p>
			</div>

			{/* Payment Methods */}
			<div className="text-center">
				<p className="text-xs text-gray-500 mb-2">Accepted Payment Methods</p>
				<div className="flex justify-center space-x-2">
					<div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
						VISA
					</div>
					<div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">
						MC
					</div>
					<div className="w-8 h-5 bg-blue-800 rounded text-white text-xs flex items-center justify-center font-bold">
						AMEX
					</div>
					<div className="w-8 h-5 bg-orange-600 rounded text-white text-xs flex items-center justify-center font-bold">
						DC
					</div>
				</div>
			</div>
		</div>
	);
};
