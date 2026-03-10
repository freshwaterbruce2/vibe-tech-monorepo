export interface BookingState {
	currentStep: BookingStep;
	guestDetails: GuestDetails;
	selectedRoom: Room | null;
	paymentInfo: PaymentInfo;
	confirmation: BookingConfirmation | null;
	errors: Record<string, string>;
	loading: boolean;
}

export type BookingStep =
	| 'room-selection'
	| 'guest-details'
	| 'payment'
	| 'confirmation';

export interface GuestDetails {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	adults: number;
	children: number;
	specialRequests?: string;
	preferences: GuestPreferences;
}

export interface GuestPreferences {
	bedType: 'king' | 'queen' | 'twin' | 'any';
	floor: 'high' | 'low' | 'any';
	roomType: 'quiet' | 'view' | 'accessible' | 'any';
	smokingAllowed: boolean;
}

export interface PaymentInfo {
	cardNumber: string;
	expiryDate: string;
	cvv: string;
	cardholderName: string;
	billingAddress: BillingAddress;
	saveCard: boolean;
}

export interface BillingAddress {
	street: string;
	city: string;
	state: string;
	zipCode: string;
	country: string;
}

export interface BookingConfirmation {
	bookingId: string;
	confirmationNumber: string;
	hotel: Hotel;
	room: Room;
	checkIn: string;
	checkOut: string;
	nights: number;
	totalAmount: number;
	currency: string;
	guestDetails: GuestDetails;
	paymentStatus: 'pending' | 'confirmed' | 'failed';
	createdAt: string;
}

export interface BookingValidation {
	isValid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

export interface ValidationWarning {
	field: string;
	message: string;
	severity: 'low' | 'medium' | 'high';
}

import type { Hotel, Room } from './hotel';
