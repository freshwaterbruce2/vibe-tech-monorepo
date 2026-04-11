import {
	AlertCircle,
	Calendar,
	Check,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	type LucideIcon,
	User,
} from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/services/bookingService';
import { useBookingStore } from '@/store/bookingStore';
import { useHotelStore } from '@/store/hotelStore';
import { useSearchStore } from '@/store/searchStore';
import type { Room } from '@/types/hotel';
import { cn } from '@/utils/cn';
import { logger } from '@/utils/logger';
import { SquarePaymentForm } from '../payment/SquarePaymentForm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface BookingFlowProps {
	selectedRoom?: Room;
	onBookingComplete?: (bookingId: string) => void;
	onCancel?: () => void;
	className?: string;
}

type BookingStep = 'room-selection' | 'guest-details' | 'payment';

const BookingFlow: React.FC<BookingFlowProps> = ({
	selectedRoom: propSelectedRoom,
	onBookingComplete,
	onCancel,
	className = '',
}) => {
	const {
		currentStep,
		guestDetails,
		selectedRoom,
		// paymentInfo,
		// confirmation,
		errors,
		// loading,
		// setCurrentStep,
		setGuestDetails,
		setSelectedRoom,
		// setPaymentInfo,
		nextStep,
		previousStep,
		validateCurrentStep,
		setLoading,
		clearBooking,
	} = useBookingStore();

	const { selectedDateRange, guestCount } = useSearchStore();
	const { selectedHotel } = useHotelStore();
	const { user, isAuthenticated } = useAuth();

	// const [cardNumberFormatted, setCardNumberFormatted] = useState('');
	// const [expiryFormatted, setExpiryFormatted] = useState('');

	useEffect(() => {
		if (propSelectedRoom && !selectedRoom) {
			setSelectedRoom(propSelectedRoom);
		}
	}, [propSelectedRoom, selectedRoom, setSelectedRoom]);

	const steps: {
		id: BookingStep;
		title: string;
		description: string;
		icon: LucideIcon;
	}[] = [
		{
			id: 'room-selection',
			title: 'Room Selection',
			description: 'Choose your room',
			icon: Calendar,
		},
		{
			id: 'guest-details',
			title: 'Guest Details',
			description: 'Enter guest information',
			icon: User,
		},
		{
			id: 'payment',
			title: 'Payment & Confirm',
			description: 'Complete booking',
			icon: CreditCard,
		},
	];

	const formatPrice = (price: number, currency = 'USD') => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
		}).format(price);
	};

	// const formatCardNumber = (value: string) => {
	//   const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
	//   const matches = v.match(/\d{4,16}/g);
	//   const match = matches && matches[0] || '';
	//   const parts = [];
	//   for (let i = 0, len = match.length; i < len; i += 4) {
	//     parts.push(match.substring(i, i + 4));
	//   }
	//   if (parts.length) {
	//     return parts.join(' ');
	//   } else {
	//     return v;
	//   }
	// };

	// const formatExpiry = (value: string) => {
	//   return value
	//     .replace(/\D/g, '')
	//     .replace(/(\d{2})(\d)/, '$1/$2')
	//     .substr(0, 5);
	// };

	const totalNights =
		selectedDateRange.checkIn && selectedDateRange.checkOut
			? Math.ceil(
					(new Date(selectedDateRange.checkOut).getTime() -
						new Date(selectedDateRange.checkIn).getTime()) /
						(1000 * 60 * 60 * 24),
				)
			: 1;

	const totalAmount = selectedRoom ? selectedRoom.price * totalNights : 0;

	// const handleCardNumberChange = (value: string) => {
	//   const formatted = formatCardNumber(value);
	//   setCardNumberFormatted(formatted);
	//   setPaymentInfo({ cardNumber: formatted.replace(/\s/g, '') });
	// };

	// const handleExpiryChange = (value: string) => {
	//   const formatted = formatExpiry(value);
	//   setExpiryFormatted(formatted);
	//   setPaymentInfo({ expiryDate: formatted });
	// };

	const handleNextStep = () => {
		if (validateCurrentStep()) {
			nextStep();
		}
	};

	const handlePreviousStep = () => {
		previousStep();
	};

	const navigate = useNavigate();

	const handleCompleteBooking = async () => {
		if (!validateCurrentStep()) {
			return;
		}

		if (!selectedRoom || !selectedHotel) {
			logger.error('Booking attempt with missing required data', {
				component: 'BookingFlow',
				method: 'handleCompleteBooking',
				hasSelectedRoom: !!selectedRoom,
				hasSelectedHotel: !!selectedHotel,
				userImpact: 'booking_blocked',
			});
			return;
		}

		setLoading(true);
		try {
			// Calculate pricing
			const nights = totalNights;
			const roomRate = selectedRoom.price;
			const taxes = roomRate * nights * 0.15; // 15% taxes
			const fees = 25; // Service fee
			const totalAmount = roomRate * nights + taxes + fees;

			// Prepare booking data with user information
			const checkInDate: string = selectedDateRange.checkIn || (new Date().toISOString().split('T')[0] as string);
			const checkOutDate: string = selectedDateRange.checkOut || (new Date(Date.now() + 86400000).toISOString().split('T')[0] as string);

			const bookingData = {
				hotelId: selectedHotel.id,
				hotelName: selectedHotel.name,
				hotelImage: selectedHotel.images?.[0]?.url || '',
				roomType: selectedRoom.type || selectedRoom.name || 'Standard Room',
				roomId: selectedRoom.id,
				checkIn: checkInDate,
				checkOut: checkOutDate,
				nights,
				guests: {
					adults: guestCount.adults,
					children: guestCount.children,
				},
				guestInfo: {
					firstName:
						guestDetails.firstName ||
						(isAuthenticated && user?.firstName) ||
						'Guest',
					lastName:
						guestDetails.lastName ||
						(isAuthenticated && user?.lastName) ||
						'User',
					email:
						guestDetails.email ||
						(isAuthenticated && user?.email) ||
						'guest@example.com',
					phone: guestDetails.phone || '555-0100',
				},
				specialRequests: guestDetails.specialRequests,
				totalAmount,
				currency: selectedRoom.currency || 'USD',
				userId: isAuthenticated ? user?.id : undefined,
			};

			// Create booking using the enhanced service
			const booking = await bookingService.createBooking(bookingData);

			// Clear booking data
			// Store booking in localStorage for confirmation page
			localStorage.setItem('lastBooking', JSON.stringify(booking));
			localStorage.setItem('lastBookingId', booking.id);

			logger.info('Booking created successfully', {
				component: 'BookingFlow',
				method: 'handleCompleteBooking',
				bookingId: booking.id,
				confirmationNumber: booking.confirmationNumber,
				hotelId: selectedHotel.id,
				totalAmount,
				isAuthenticated,
				userId: user?.id,
				userImpact: 'booking_completed',
			});

			clearBooking();

			// Navigate to confirmation page with booking data
			if (onBookingComplete) {
				onBookingComplete(booking.confirmationNumber || booking.id);
			} else {
				// Navigate to confirmation page with confirmation number
				navigate(`/confirmation/${booking.confirmationNumber || booking.id}`, {
					state: {
						booking,
						paymentIntent: {
							id: booking.confirmationNumber || booking.id,
							status: 'succeeded',
							amount: totalAmount * 100,
							currency: selectedRoom.currency || 'USD',
						},
					},
				});
			}
		} catch (error) {
			logger.error('Booking creation failed', {
				component: 'BookingFlow',
				method: 'handleCompleteBooking',
				hotelId: selectedHotel?.id,
				roomId: selectedRoom?.id,
				guestEmail: guestDetails.email,
				isAuthenticated,
				userId: user?.id,
				error: error instanceof Error ? error.message : 'Unknown error',
				userImpact: 'booking_failed',
			});
			// Error is already displayed by the booking service toast
		} finally {
			setLoading(false);
		}
	};

	const renderStepIndicator = () => {
		const currentIndex = steps.findIndex((s) => s.id === currentStep);
		const getStepClasses = (isActive: boolean, isCompleted: boolean) => {
			if (isActive) {
				return 'border-primary-600 bg-primary-600 text-white shadow-lg scale-110';
			}

			if (isCompleted) {
				return 'border-green-600 bg-green-600 text-white';
			}

			return 'border-gray-300 bg-white text-gray-400';
		};

		return (
			<div className="flex items-center justify-between mb-8">
				{steps.map((step, index) => {
					const isActive = step.id === currentStep;
					const isCompleted = currentIndex > index;
					const IconComponent = step.icon;

					return (
						<div key={step.id} className="flex items-center">
							<div
								className={cn(
									'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300',
									getStepClasses(isActive, isCompleted),
								)}
							>
								{isCompleted ? (
									<Check className="w-6 h-6" data-testid="check-icon" />
								) : (
									<IconComponent className="w-6 h-6" />
								)}
							</div>

							<div className="ml-4 hidden sm:block">
								<div
									className={cn(
										'text-sm font-medium transition-colors',
										isActive
											? 'text-primary-600'
											: 'text-gray-900 dark:text-white',
									)}
								>
									{step.title}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">
									{step.description}
								</div>
							</div>

							{index < steps.length - 1 && (
								<div
									className={cn(
										'w-12 sm:w-24 h-0.5 mx-6 transition-colors duration-300',
										isCompleted
											? 'bg-green-600'
											: 'bg-gray-300 dark:bg-gray-600',
									)}
								/>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	const renderRoomSelectionStep = () => {
		// Use rooms from hotel details or generate mock rooms
		const getRooms = (): Room[] => {
			// First check if hotel has rooms property
			if (
				selectedHotel &&
				'rooms' in selectedHotel &&
				Array.isArray(selectedHotel.rooms)
			) {
				return selectedHotel.rooms;
			}

			// Otherwise generate mock rooms
			if (!selectedHotel || !selectedHotel.priceRange) {
				return [];
			}

			const basePrice = selectedHotel.priceRange.avgNightly || 100;
			return [
				{
					id: `${selectedHotel.id}-room-1`,
					name: 'Standard Room',
					type: 'Standard',
					capacity: 2,
					price: Math.round(basePrice * 0.8),
					currency: selectedHotel.priceRange.currency || 'USD',
					amenities: ['Free WiFi', 'Air Conditioning', 'TV'],
					images: [selectedHotel.images[0]?.url || '/placeholder-room.jpg'],
					availability: true,
					description:
						'Comfortable room with all essential amenities for a pleasant stay.',
				},
				{
					id: `${selectedHotel.id}-room-2`,
					name: 'Deluxe Room',
					type: 'Deluxe',
					capacity: 4,
					price: Math.round(basePrice),
					currency: selectedHotel.priceRange.currency || 'USD',
					amenities: [
						'Free WiFi',
						'Air Conditioning',
						'TV',
						'Mini Bar',
						'City View',
					],
					images: [selectedHotel.images[0]?.url || '/placeholder-room.jpg'],
					availability: true,
					description:
						'Spacious room with premium amenities and beautiful city views.',
				},
				{
					id: `${selectedHotel.id}-room-3`,
					name: 'Suite',
					type: 'Suite',
					capacity: 6,
					price: Math.round(basePrice * 1.5),
					currency: selectedHotel.priceRange.currency || 'USD',
					amenities: [
						'Free WiFi',
						'Air Conditioning',
						'TV',
						'Mini Bar',
						'Ocean View',
						'Living Area',
						'Balcony',
					],
					images: [selectedHotel.images[0]?.url || '/placeholder-room.jpg'],
					availability: true,
					description:
						'Luxurious suite with separate living area, premium amenities and stunning ocean views.',
				},
			];
		};

		// Get available rooms
		const availableRooms = getRooms();

		return (
			<div className="space-y-6">
				<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					{selectedRoom ? 'Selected Room' : 'Choose Your Room'}
				</h3>

				{selectedRoom ? (
					<Card className="p-6">
						<div className="flex flex-col lg:flex-row gap-6">
							<div className="lg:w-1/3">
								<img
									src={selectedRoom.images[0] || '/placeholder-room.jpg'}
									alt={selectedRoom.name}
									className="w-full h-48 object-cover rounded-lg"
									onError={(e) => {
										(e.target as HTMLImageElement).src =
											'/placeholder-room.jpg';
									}}
								/>
							</div>

							<div className="lg:w-2/3">
								<h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
									{selectedRoom.name}
								</h4>
								<p className="text-gray-600 dark:text-gray-400 mb-4">
									{selectedRoom.description}
								</p>

								<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
									<span>ðŸ‘¥ Up to {selectedRoom.capacity} guests</span>
									<span>ðŸ›ï¸ {selectedRoom.type}</span>
								</div>

								<div className="flex flex-wrap gap-2 mb-4">
									{selectedRoom.amenities.map((amenity, index) => (
										<span
											key={index}
											className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 text-sm rounded-full"
										>
											{amenity}
										</span>
									))}
								</div>

								<div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
									<div>
										<div className="text-2xl font-bold text-primary-600">
											{formatPrice(selectedRoom.price, selectedRoom.currency)}
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											per night
										</div>
									</div>

									<div className="text-right">
										<div className="text-lg font-semibold text-gray-900 dark:text-white">
											Total: {formatPrice(totalAmount, selectedRoom.currency)}
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											{totalNights} night{totalNights > 1 ? 's' : ''}
										</div>
									</div>
								</div>

								<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setSelectedRoom(null)}
										className="text-primary-600 hover:text-primary-700"
									>
										Change Room
									</Button>
								</div>
							</div>
						</div>
					</Card>
				) : (
					<div className="space-y-4">
						{availableRooms.length > 0 ? (
							availableRooms.map((room) => (
								<Card
									key={room.id}
									className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
									onClick={() => setSelectedRoom(room)}
								>
									<div className="flex flex-col lg:flex-row gap-6">
										<div className="lg:w-1/3">
											<img
												src={room.images?.[0] || '/placeholder-room.jpg'}
												alt={room.name}
												className="w-full h-48 object-cover rounded-lg"
												onError={(e) => {
													(e.target as HTMLImageElement).src =
														'/placeholder-room.jpg';
												}}
											/>
										</div>
										<div className="lg:w-2/3">
											<h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
												{room.name}
											</h4>
											<p className="text-gray-600 dark:text-gray-400 mb-4">
												{room.description}
											</p>
											<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
												<span>👥 Up to {room.capacity} guests</span>
												<span>🛏️ {room.type}</span>
											</div>
											<div className="flex flex-wrap gap-2 mb-4">
												{room.amenities?.slice(0, 4).map(
													(amenity, index) => (
													<span
														key={index}
														className={[
														'px-3 py-1 bg-primary-100',
														'dark:bg-primary-900/20',
														'text-primary-800',
														'dark:text-primary-300',
														'text-sm rounded-full',
													].join(' ')}
													>
														{amenity}
													</span>
												))}
											</div>
											<div className="flex items-center justify-between">
												<div>
													<div className="text-2xl font-bold text-primary-600">
														{formatPrice(room.price, room.currency)}
													</div>
													<div className="text-sm text-gray-500 dark:text-gray-400">
														per night
													</div>
												</div>
												<Button
													onClick={(e) => {
														e.stopPropagation();
														setSelectedRoom(room);
													}}
													className="min-w-[120px]"
												>
													Select Room
												</Button>
											</div>
										</div>
									</div>
								</Card>
							))
						) : (
							<Card className="p-8 text-center">
								<div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
									<Calendar className="w-8 h-8 text-gray-400" />
								</div>
								<p className="text-gray-600 dark:text-gray-400">
									No rooms available for the selected dates.
								</p>
							</Card>
						)}
					</div>
				)}
			</div>
		);
	};

	const renderGuestDetailsStep = () => (
		<div className="space-y-6">
			<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
				Guest Information
			</h3>

			<Card className="p-6">
				<h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
					Main Guest
				</h4>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							First Name *
						</label>
						<Input
							id="guest-first-name"
							name="firstName"
							autoComplete="given-name"
							value={guestDetails.firstName}
							onChange={(e) => setGuestDetails({ firstName: e.target.value })}
							error={errors.firstName}
							placeholder="Enter first name"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Last Name *
						</label>
						<Input
							id="guest-last-name"
							name="lastName"
							autoComplete="family-name"
							value={guestDetails.lastName}
							onChange={(e) => setGuestDetails({ lastName: e.target.value })}
							error={errors.lastName}
							placeholder="Enter last name"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Email *
						</label>
						<Input
							id="guest-email"
							name="email"
							type="email"
							autoComplete="email"
							value={guestDetails.email}
							onChange={(e) => setGuestDetails({ email: e.target.value })}
							error={errors.email}
							placeholder="Enter email address"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Phone *
						</label>
						<Input
							id="guest-phone"
							name="phone"
							type="tel"
							autoComplete="tel"
							value={guestDetails.phone}
							onChange={(e) => setGuestDetails({ phone: e.target.value })}
							error={errors.phone}
							placeholder="Enter phone number"
							required
						/>
					</div>
				</div>

				<div className="mt-6">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Special Requests (Optional)
					</label>
					<textarea
						value={guestDetails.specialRequests}
						onChange={(e) =>
							setGuestDetails({ specialRequests: e.target.value })
						}
						rows={3}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
						placeholder="Any special requests or preferences?"
					/>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Special requests are subject to availability and may incur
						additional charges.
					</p>
				</div>
			</Card>
		</div>
	);

	const handlePaymentSuccess = async (paymentResult: {
		paymentId: string;
		receiptUrl?: string;
	}) => {
		logger.info('Payment completed successfully', {
			component: 'BookingFlow',
			method: 'handlePaymentSuccess',
			paymentId: paymentResult.paymentId,
			hasReceiptUrl: !!paymentResult.receiptUrl,
			hotelId: selectedHotel?.id,
			roomId: selectedRoom?.id,
		});
		// Payment successful - immediately create booking and navigate to confirmation
		await handleCompleteBooking();
	};

	const handlePaymentError = (error: Error) => {
		logger.error('Payment processing failed', {
			component: 'BookingFlow',
			method: 'handlePaymentError',
			hotelId: selectedHotel?.id,
			roomId: selectedRoom?.id,
			error: error.message,
			userImpact: 'payment_blocked',
		});
		toast.error(`Payment failed: ${error.message}. Please try again.`);
	};

	const renderPaymentStep = () => {
		// Ensure we have all required data
		if (!selectedRoom || !selectedHotel || !guestDetails.email) {
			return (
				<div className="text-center py-8">
					<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p className="text-gray-600">
						Missing required information. Please go back and complete previous
						steps.
					</p>
				</div>
			);
		}

		return (
			<div className="space-y-6">
				<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					Complete Your Payment
				</h3>

				{/* Booking Summary */}
				<Card className="p-6 bg-gray-50 dark:bg-gray-800">
					<h4 className="text-lg font-semibold mb-4">Booking Summary</h4>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600">Hotel:</span>
							<span className="font-medium">{selectedHotel.name}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Room:</span>
							<span className="font-medium">{selectedRoom.name}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Check-in:</span>
							<span className="font-medium">{selectedDateRange.checkIn}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Check-out:</span>
							<span className="font-medium">{selectedDateRange.checkOut}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Guest:</span>
							<span className="font-medium">
								{guestDetails.firstName} {guestDetails.lastName}
							</span>
						</div>
						<div className="border-t pt-2 mt-2">
							<div className="flex justify-between text-lg font-semibold">
								<span>Total Amount:</span>
								<span className="text-primary-600">
									{formatPrice(totalAmount, selectedRoom.currency || 'USD')}
								</span>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								Includes taxes and fees
							</p>
						</div>
					</div>
				</Card>

				{/* Square Payment Form */}
				<SquarePaymentForm
					bookingId={`booking-${Date.now()}`}
					amount={totalAmount}
					currency={selectedRoom.currency || 'USD'}
					onSuccess={handlePaymentSuccess}
					onError={handlePaymentError}
					bookingDetails={{
						hotelName: selectedHotel.name,
						checkIn: selectedDateRange.checkIn || '',
						checkOut: selectedDateRange.checkOut || '',
						guests: guestCount.adults + guestCount.children,
					}}
				/>
			</div>
		);
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 'room-selection':
				return renderRoomSelectionStep();
			case 'guest-details':
				return renderGuestDetailsStep();
			case 'payment':
				return renderPaymentStep();
			default:
				return null;
		}
	};

	return (
		<div className={cn('max-w-4xl mx-auto', className)}>
			<Card className="p-8">
				{renderStepIndicator()}

				<div className="min-h-[500px]">{renderStepContent()}</div>

				{/* Navigation */}
				<div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
					<div>
						{currentStep !== 'room-selection' && (
							<Button
								onClick={handlePreviousStep}
								variant="outline"
								className="flex items-center gap-2"
							>
								<ChevronLeft className="w-4 h-4" />
								Previous
							</Button>
						)}
					</div>

					<div className="flex gap-3">
						{onCancel && (
							<Button
								onClick={() => {
									clearBooking();
									onCancel();
								}}
								variant="outline"
							>
								Cancel
							</Button>
						)}

						{currentStep !== 'payment' && (
							<Button
								onClick={handleNextStep}
								className="flex items-center gap-2 px-6"
								size="lg"
							>
								Continue
								<ChevronRight className="w-4 h-4" />
							</Button>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
};

export { BookingFlow };
export default BookingFlow;
