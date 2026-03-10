import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GuestDetails, PaymentInfo } from '@/types/booking';
import type { BookingStore } from './types';

const initialGuestDetails: GuestDetails = {
	firstName: '',
	lastName: '',
	email: '',
	phone: '',
	adults: 2,
	children: 0,
	specialRequests: '',
	preferences: {
		bedType: 'any',
		floor: 'any',
		roomType: 'any',
		smokingAllowed: false,
	},
};

const initialPaymentInfo: PaymentInfo = {
	cardNumber: '',
	expiryDate: '',
	cvv: '',
	cardholderName: '',
	billingAddress: {
		street: '',
		city: '',
		state: '',
		zipCode: '',
		country: '',
	},
	saveCard: false,
};

const bookingSteps = [
	'room-selection',
	'guest-details',
	'payment',
	'confirmation',
] as const;

export const useBookingStore = create<BookingStore>()(
	devtools(
		persist(
			(set, get) => ({
				// Initial state
				currentStep: 'room-selection',
				guestDetails: initialGuestDetails,
				selectedRoom: null,
				paymentInfo: initialPaymentInfo,
				confirmation: null,
				errors: {},
				loading: false,

				// Actions
				setCurrentStep: (step) => set({ currentStep: step }),

				setGuestDetails: (details) =>
					set((state) => ({
						guestDetails: { ...state.guestDetails, ...details },
					})),

				setSelectedRoom: (room) => set({ selectedRoom: room }),

				setPaymentInfo: (info) =>
					set((state) => ({
						paymentInfo: { ...state.paymentInfo, ...info },
					})),

				setConfirmation: (confirmation) => set({ confirmation }),

				setErrors: (errors) => set({ errors }),

				setLoading: (loading) => set({ loading }),

				clearBooking: () =>
					set({
						currentStep: 'room-selection',
						guestDetails: initialGuestDetails,
						selectedRoom: null,
						paymentInfo: initialPaymentInfo,
						confirmation: null,
						errors: {},
						loading: false,
					}),

				nextStep: () => {
					const { currentStep } = get();
					const currentIndex = bookingSteps.indexOf(currentStep);
					if (currentIndex < bookingSteps.length - 1) {
						set({ currentStep: bookingSteps[currentIndex + 1] });
					}
				},

				previousStep: () => {
					const { currentStep } = get();
					const currentIndex = bookingSteps.indexOf(currentStep);
					if (currentIndex > 0) {
						set({ currentStep: bookingSteps[currentIndex - 1] });
					}
				},

				validateCurrentStep: () => {
					const { currentStep, selectedRoom, guestDetails, paymentInfo } =
						get();
					let isValid = true;
					const errors: Record<string, string> = {};

					switch (currentStep) {
						case 'room-selection':
							if (!selectedRoom) {
								errors.room = 'Please select a room';
								isValid = false;
							}
							break;

						case 'guest-details':
							if (!guestDetails.firstName) {
								errors.firstName = 'First name is required';
								isValid = false;
							}
							if (!guestDetails.lastName) {
								errors.lastName = 'Last name is required';
								isValid = false;
							}
							if (!guestDetails.email) {
								errors.email = 'Email is required';
								isValid = false;
							}
							if (!guestDetails.phone) {
								errors.phone = 'Phone number is required';
								isValid = false;
							}
							break;

						case 'payment':
							if (!paymentInfo.cardNumber) {
								errors.cardNumber = 'Card number is required';
								isValid = false;
							}
							if (!paymentInfo.expiryDate) {
								errors.expiryDate = 'Expiry date is required';
								isValid = false;
							}
							if (!paymentInfo.cvv) {
								errors.cvv = 'CVV is required';
								isValid = false;
							}
							if (!paymentInfo.cardholderName) {
								errors.cardholderName = 'Cardholder name is required';
								isValid = false;
							}
							break;

						default:
							break;
					}

					set({ errors });
					return isValid;
				},
			}),
			{
				name: 'booking-store',
				// Only persist certain parts of the booking state
				partialize: (state) => ({
					guestDetails: state.guestDetails,
					selectedRoom: state.selectedRoom,
					currentStep: state.currentStep,
				}),
			},
		),
		{ name: 'BookingStore' },
	),
);
