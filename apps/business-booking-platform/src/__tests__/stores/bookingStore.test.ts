import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingStore } from "@/store/bookingStore";

// import { testUtils } from '../setup';

// Mock the store
vi.mock("zustand/middleware", () => ({
	devtools: vi.fn((fn) => fn),
	persist: vi.fn((fn) => fn),
}));

describe("BookingStore", () => {
	const initialGuestDetails = {
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		adults: 2,
		children: 0,
		specialRequests: "",
		preferences: {
			bedType: "any" as const,
			floor: "any" as const,
			roomType: "any" as const,
			smokingAllowed: false,
		},
	};

	const initialPaymentInfo = {
		cardNumber: "",
		expiryDate: "",
		cvv: "",
		cardholderName: "",
		billingAddress: {
			street: "",
			city: "",
			state: "",
			zipCode: "",
			country: "",
		},
		saveCard: false,
	};

	beforeEach(() => {
		// Reset store state before each test
		useBookingStore.setState({
			currentStep: "room-selection",
			guestDetails: initialGuestDetails,
			selectedRoom: null,
			paymentInfo: initialPaymentInfo,
			confirmation: null,
			errors: {},
			loading: false,
		});
	});

	describe("Initial State", () => {
		it("should initialize with correct default values", () => {
			const state = useBookingStore.getState();

			expect(state.currentStep).toBe("room-selection");
			expect(state.guestDetails).toEqual(initialGuestDetails);
			expect(state.selectedRoom).toBe(null);
			expect(state.paymentInfo).toEqual(initialPaymentInfo);
			expect(state.confirmation).toBe(null);
			expect(state.errors).toEqual({});
			expect(state.loading).toBe(false);
		});
	});

	describe("Step Management", () => {
		it("should set current step correctly", () => {
			const { setCurrentStep } = useBookingStore.getState();

			setCurrentStep("guest-details");

			const state = useBookingStore.getState();
			expect(state.currentStep).toBe("guest-details");
		});

		it("should advance to next step", () => {
			const { nextStep } = useBookingStore.getState();

			nextStep();

			let state = useBookingStore.getState();
			expect(state.currentStep).toBe("guest-details");

			nextStep();

			state = useBookingStore.getState();
			expect(state.currentStep).toBe("payment");

			nextStep();

			state = useBookingStore.getState();
			expect(state.currentStep).toBe("confirmation");
		});

		it("should not advance beyond last step", () => {
			const { setCurrentStep, nextStep } = useBookingStore.getState();

			setCurrentStep("confirmation");
			nextStep();

			const state = useBookingStore.getState();
			expect(state.currentStep).toBe("confirmation");
		});

		it("should go to previous step", () => {
			const { setCurrentStep, previousStep } = useBookingStore.getState();

			setCurrentStep("payment");
			previousStep();

			let state = useBookingStore.getState();
			expect(state.currentStep).toBe("guest-details");

			previousStep();

			state = useBookingStore.getState();
			expect(state.currentStep).toBe("room-selection");
		});

		it("should not go before first step", () => {
			const { previousStep } = useBookingStore.getState();

			previousStep();

			const state = useBookingStore.getState();
			expect(state.currentStep).toBe("room-selection");
		});
	});

	describe("Guest Details Management", () => {
		it("should set guest details partially", () => {
			const { setGuestDetails } = useBookingStore.getState();

			setGuestDetails({
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
			});

			const state = useBookingStore.getState();
			expect(state.guestDetails.firstName).toBe("John");
			expect(state.guestDetails.lastName).toBe("Doe");
			expect(state.guestDetails.email).toBe("john.doe@example.com");
			// Other fields should remain unchanged
			expect(state.guestDetails.phone).toBe("");
			expect(state.guestDetails.adults).toBe(2);
		});

		it("should update guest preferences", () => {
			const { setGuestDetails } = useBookingStore.getState();

			setGuestDetails({
				preferences: {
					bedType: "king" as const,
					floor: "high" as const,
					roomType: "view" as const,
					smokingAllowed: true,
				},
			});

			const state = useBookingStore.getState();
			expect(state.guestDetails.preferences).toEqual({
				bedType: "king",
				floor: "high",
				roomType: "view",
				smokingAllowed: true,
			});
		});
	});

	describe("Room Selection", () => {
		it("should set selected room", () => {
			const { setSelectedRoom } = useBookingStore.getState();

			const mockRoom = {
				id: "room-123",
				name: "Deluxe Room",
				type: "deluxe",
				capacity: 2,
				price: 250,
				currency: "USD",
				amenities: ["WiFi", "AC", "TV"],
				images: ["room1.jpg"],
				availability: true,
				description: "A comfortable deluxe room",
			};

			setSelectedRoom(mockRoom);

			const state = useBookingStore.getState();
			expect(state.selectedRoom).toEqual(mockRoom);
		});

		it("should clear selected room", () => {
			const { setSelectedRoom } = useBookingStore.getState();

			const mockRoom = {
				id: "room-123",
				name: "Deluxe Room",
				type: "deluxe",
				capacity: 2,
				price: 250,
				currency: "USD",
				amenities: ["WiFi"],
				images: ["room1.jpg"],
				availability: true,
				description: "A deluxe room",
			};
			setSelectedRoom(mockRoom);

			// Clear room
			setSelectedRoom(null);

			const state = useBookingStore.getState();
			expect(state.selectedRoom).toBe(null);
		});
	});

	describe("Payment Information", () => {
		it("should set payment info partially", () => {
			const { setPaymentInfo } = useBookingStore.getState();

			setPaymentInfo({
				cardholderName: "John Doe",
				cardNumber: "4242424242424242",
				expiryDate: "12/25",
				cvv: "123",
			});

			const state = useBookingStore.getState();
			expect(state.paymentInfo.cardholderName).toBe("John Doe");
			expect(state.paymentInfo.cardNumber).toBe("4242424242424242");
			expect(state.paymentInfo.expiryDate).toBe("12/25");
			expect(state.paymentInfo.cvv).toBe("123");
			// Billing address should remain unchanged
			expect(state.paymentInfo.billingAddress.street).toBe("");
		});

		it("should update billing address", () => {
			const { setPaymentInfo } = useBookingStore.getState();

			setPaymentInfo({
				billingAddress: {
					street: "123 Main St",
					city: "New York",
					state: "NY",
					zipCode: "10001",
					country: "US",
				},
			});

			const state = useBookingStore.getState();
			expect(state.paymentInfo.billingAddress).toEqual({
				street: "123 Main St",
				city: "New York",
				state: "NY",
				zipCode: "10001",
				country: "US",
			});
		});
	});

	describe("Validation", () => {
		it("should validate room selection step", () => {
			const { validateCurrentStep } = useBookingStore.getState();

			// Should fail without room selection
			let isValid = validateCurrentStep();
			expect(isValid).toBe(false);

			const state = useBookingStore.getState();
			expect(state.errors.room).toBe("Please select a room");

			// Should pass with room selection
			const { setSelectedRoom } = useBookingStore.getState();
			setSelectedRoom({
				id: "room-123",
				name: "Deluxe Room",
				type: "deluxe",
				capacity: 2,
				price: 250,
				currency: "USD",
				amenities: ["WiFi"],
				images: ["room1.jpg"],
				availability: true,
				description: "A deluxe room",
			});

			isValid = validateCurrentStep();
			expect(isValid).toBe(true);
		});

		it("should validate guest details step", () => {
			const { setCurrentStep, validateCurrentStep } =
				useBookingStore.getState();

			setCurrentStep("guest-details");

			// Should fail with empty required fields
			let isValid = validateCurrentStep();
			expect(isValid).toBe(false);

			const state = useBookingStore.getState();
			expect(state.errors.firstName).toBe("First name is required");
			expect(state.errors.lastName).toBe("Last name is required");
			expect(state.errors.email).toBe("Email is required");
			expect(state.errors.phone).toBe("Phone number is required");

			// Should pass with all required fields
			const { setGuestDetails } = useBookingStore.getState();
			setGuestDetails({
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				phone: "+1234567890",
			});

			isValid = validateCurrentStep();
			expect(isValid).toBe(true);
		});

		it("should validate payment step", () => {
			const { setCurrentStep, validateCurrentStep } =
				useBookingStore.getState();

			setCurrentStep("payment");

			// Should fail with empty payment fields
			let isValid = validateCurrentStep();
			expect(isValid).toBe(false);

			const state = useBookingStore.getState();
			expect(state.errors.cardNumber).toBe("Card number is required");
			expect(state.errors.expiryDate).toBe("Expiry date is required");
			expect(state.errors.cvv).toBe("CVV is required");
			expect(state.errors.cardholderName).toBe("Cardholder name is required");

			// Should pass with all payment fields
			const { setPaymentInfo } = useBookingStore.getState();
			setPaymentInfo({
				cardNumber: "4242424242424242",
				expiryDate: "12/25",
				cvv: "123",
				cardholderName: "John Doe",
			});

			isValid = validateCurrentStep();
			expect(isValid).toBe(true);
		});

		it("should not validate confirmation step", () => {
			const { setCurrentStep, validateCurrentStep } =
				useBookingStore.getState();

			setCurrentStep("confirmation");

			const isValid = validateCurrentStep();
			expect(isValid).toBe(true); // Confirmation step always passes
		});
	});

	describe("Loading and Error States", () => {
		it("should set loading state", () => {
			const { setLoading } = useBookingStore.getState();

			setLoading(true);

			let state = useBookingStore.getState();
			expect(state.loading).toBe(true);

			setLoading(false);

			state = useBookingStore.getState();
			expect(state.loading).toBe(false);
		});

		it("should set errors", () => {
			const { setErrors } = useBookingStore.getState();

			const errors = {
				firstName: "Required field",
				payment: "Payment failed",
			};

			setErrors(errors);

			const state = useBookingStore.getState();
			expect(state.errors).toEqual(errors);
		});
	});

	describe("Confirmation", () => {
		it("should set confirmation data", () => {
			const { setConfirmation } = useBookingStore.getState();

			const confirmationData = {
				bookingId: "BOOK123",
				confirmationNumber: "CONF456",
				hotel: {
					id: "hotel-1",
					name: "Test Hotel",
					location: {
						address: "123 Test St",
						city: "Test City",
						country: "Test Country",
						coordinates: { lat: 0, lng: 0 },
					},
					rating: 4.5,
					reviewCount: 100,
					priceRange: {
						min: 200,
						max: 400,
						currency: "USD",
						avgNightly: 300,
					},
					amenities: [],
					images: [],
					description: "A test hotel",
					availability: { available: true, lastChecked: "2024-12-01" },
				},
				room: {
					id: "room-123",
					name: "Deluxe Room",
					type: "deluxe",
					capacity: 2,
					price: 250,
					currency: "USD",
					amenities: ["WiFi"],
					images: ["room1.jpg"],
					availability: true,
					description: "A deluxe room",
				},
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
				nights: 2,
				totalAmount: 500,
				currency: "USD",
				guestDetails: initialGuestDetails,
				paymentStatus: "confirmed" as const,
				createdAt: "2024-12-01T10:00:00Z",
			};

			setConfirmation(confirmationData);

			const state = useBookingStore.getState();
			expect(state.confirmation).toEqual(confirmationData);
		});
	});

	describe("Clear Booking", () => {
		it("should reset all booking state", () => {
			const store = useBookingStore.getState();

			// Set some values
			store.setCurrentStep("payment");
			store.setGuestDetails({ firstName: "John", lastName: "Doe" });
			store.setSelectedRoom({
				id: "room-123",
				name: "Deluxe Room",
				type: "deluxe",
				capacity: 2,
				price: 250,
				currency: "USD",
				amenities: ["WiFi"],
				images: ["room1.jpg"],
				availability: true,
				description: "A deluxe room",
			});
			store.setPaymentInfo({ cardholderName: "John Doe" });
			store.setConfirmation({
				bookingId: "BOOK123",
				confirmationNumber: "CONF123",
				hotel: {
					id: "hotel-1",
					name: "Test Hotel",
					location: {
						address: "123 Test St",
						city: "Test City",
						country: "Test Country",
						coordinates: { lat: 0, lng: 0 },
					},
					rating: 4.5,
					reviewCount: 100,
					priceRange: {
						min: 200,
						max: 400,
						currency: "USD",
						avgNightly: 300,
					},
					amenities: [],
					images: [],
					description: "A test hotel",
					availability: { available: true, lastChecked: "2024-12-01" },
				},
				room: {
					id: "room-123",
					name: "Deluxe Room",
					type: "deluxe",
					capacity: 2,
					price: 250,
					currency: "USD",
					amenities: ["WiFi"],
					images: ["room1.jpg"],
					availability: true,
					description: "A deluxe room",
				},
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
				nights: 2,
				totalAmount: 500,
				currency: "USD",
				guestDetails: initialGuestDetails,
				paymentStatus: "confirmed",
				createdAt: "2024-12-01T10:00:00Z",
			});
			store.setErrors({ firstName: "Error" });
			store.setLoading(true);

			// Clear booking
			store.clearBooking();

			const state = useBookingStore.getState();
			expect(state.currentStep).toBe("room-selection");
			expect(state.guestDetails).toEqual(initialGuestDetails);
			expect(state.selectedRoom).toBe(null);
			expect(state.paymentInfo).toEqual(initialPaymentInfo);
			expect(state.confirmation).toBe(null);
			expect(state.errors).toEqual({});
			expect(state.loading).toBe(false);
		});
	});

	describe("Complete Booking Flow", () => {
		it("should handle complete booking workflow", () => {
			const store = useBookingStore.getState();

			// Step 1: Room selection
			expect(store.validateCurrentStep()).toBe(false);
			store.setSelectedRoom({
				id: "room-deluxe-001",
				name: "Deluxe Suite",
				type: "deluxe",
				capacity: 2,
				price: 350,
				currency: "USD",
				amenities: ["WiFi", "AC", "Minibar"],
				images: ["suite1.jpg"],
				availability: true,
				description: "A luxurious deluxe suite",
			});
			expect(store.validateCurrentStep()).toBe(true);
			store.nextStep();

			// Step 2: Guest details
			expect(useBookingStore.getState().currentStep).toBe("guest-details");
			expect(store.validateCurrentStep()).toBe(false);
			store.setGuestDetails({
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				phone: "+1234567890",
				specialRequests: "Late check-in",
				preferences: {
					bedType: "king" as const,
					floor: "high" as const,
					roomType: "view" as const,
					smokingAllowed: false,
				},
			});
			expect(store.validateCurrentStep()).toBe(true);
			store.nextStep();

			// Step 3: Payment
			expect(useBookingStore.getState().currentStep).toBe("payment");
			expect(store.validateCurrentStep()).toBe(false);
			store.setPaymentInfo({
				cardNumber: "4242424242424242",
				expiryDate: "12/25",
				cvv: "123",
				cardholderName: "John Doe",
				billingAddress: {
					street: "123 Main St",
					city: "New York",
					state: "NY",
					zipCode: "10001",
					country: "US",
				},
				saveCard: true,
			});
			expect(store.validateCurrentStep()).toBe(true);

			// Process payment
			store.setLoading(true);
			store.setConfirmation({
				bookingId: "BOOK789",
				confirmationNumber: "CONF123",
				hotel: {
					id: "hotel-1",
					name: "Test Hotel",
					location: {
						address: "123 Test St",
						city: "Test City",
						country: "Test Country",
						coordinates: { lat: 0, lng: 0 },
					},
					rating: 4.5,
					reviewCount: 100,
					priceRange: {
						min: 200,
						max: 400,
						currency: "USD",
						avgNightly: 300,
					},
					amenities: [],
					images: [],
					description: "A test hotel",
					availability: { available: true, lastChecked: "2024-12-01" },
				},
				room: {
					id: "room-deluxe-001",
					name: "Deluxe Suite",
					type: "deluxe",
					capacity: 2,
					price: 350,
					currency: "USD",
					amenities: ["WiFi", "AC", "Minibar"],
					images: ["suite1.jpg"],
					availability: true,
					description: "A luxurious deluxe suite",
				},
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
				nights: 2,
				totalAmount: 700,
				currency: "USD",
				guestDetails: {
					firstName: "John",
					lastName: "Doe",
					email: "john.doe@example.com",
					phone: "+1234567890",
					adults: 2,
					children: 0,
					specialRequests: "Late check-in",
					preferences: {
						bedType: "king",
						floor: "high",
						roomType: "view",
						smokingAllowed: false,
					},
				},
				paymentStatus: "confirmed" as const,
				createdAt: "2024-12-01T10:00:00Z",
			});
			store.setLoading(false);
			store.nextStep();

			// Step 4: Confirmation
			const finalState = useBookingStore.getState();
			expect(finalState.currentStep).toBe("confirmation");
			expect(finalState.confirmation?.bookingId).toBe("BOOK789");
			expect(finalState.selectedRoom?.type).toBe("deluxe");
			expect(finalState.guestDetails.firstName).toBe("John");
			expect(finalState.paymentInfo.saveCard).toBe(true);
			expect(finalState.loading).toBe(false);
		});
	});
});
