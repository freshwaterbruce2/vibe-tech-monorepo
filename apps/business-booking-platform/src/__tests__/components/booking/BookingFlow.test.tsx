import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingFlow } from "@/components/booking/BookingFlow";
import { useBookingStore } from "@/store/bookingStore";
import { useHotelStore } from "@/store/hotelStore";
import { useSearchStore } from "@/store/searchStore";

expect.extend(toHaveNoViolations);

// Mock the stores
vi.mock("@/store/bookingStore");
vi.mock("@/store/searchStore");
vi.mock("@/store/hotelStore");

const mockBookingStore = {
	currentStep: "room-selection",
	guestDetails: {
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		specialRequests: "",
	},
	selectedRoom: null,
	paymentInfo: {
		cardholderName: "",
		cardNumber: "",
		expiryDate: "",
		cvv: "",
		billingAddress: {
			street: "",
			city: "",
			state: "",
			zipCode: "",
			country: "",
		},
		saveCard: false,
	},
	confirmation: null,
	errors: {},
	loading: false,
	setCurrentStep: vi.fn(),
	setGuestDetails: vi.fn(),
	setSelectedRoom: vi.fn(),
	setPaymentInfo: vi.fn(),
	nextStep: vi.fn(),
	previousStep: vi.fn(),
	validateCurrentStep: vi.fn().mockReturnValue(true),
	setLoading: vi.fn(),
	clearBooking: vi.fn(),
};

const mockSearchStore = {
	selectedDateRange: {
		checkIn: "2024-12-01",
		checkOut: "2024-12-03",
	},
	guestCount: {
		adults: 2,
		children: 0,
		rooms: 1,
	},
};

const mockHotelStore = {
	selectedHotel: {
		id: "hotel-1",
		name: "Test Hotel",
		location: {
			city: "Test City",
			country: "TC",
			neighborhood: "Downtown",
		},
		priceRange: {
			avgNightly: 200,
			currency: "USD",
			min: 150,
			max: 300,
		},
		images: [{ url: "/test-image.jpg", alt: "Test Hotel" }],
	},
};

const mockRoom = {
	id: "room-1",
	name: "Deluxe Room",
	description: "A spacious room with modern amenities",
	type: "Standard",
	capacity: 2,
	price: 150,
	currency: "USD",
	images: ["room-image.jpg"],
	amenities: ["WiFi", "Air Conditioning", "Mini Bar"],
	availability: true,
};

describe("BookingFlow Component", () => {
	const mockProps = {
		selectedRoom: mockRoom,
		onBookingComplete: vi.fn(),
		onCancel: vi.fn(),
		className: "test-class",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useBookingStore as any).mockReturnValue(mockBookingStore);
		(useSearchStore as any).mockReturnValue(mockSearchStore);
		(useHotelStore as any).mockReturnValue(mockHotelStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Step Indicator", () => {
		it("renders all booking steps correctly", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Room Selection")).toBeInTheDocument();
			expect(screen.getByText("Guest Details")).toBeInTheDocument();
			expect(screen.getByText("Payment")).toBeInTheDocument();
			expect(screen.getByText("Confirmation")).toBeInTheDocument();
		});

		it("highlights current step correctly", () => {
			const storeWithGuestStep = {
				...mockBookingStore,
				currentStep: "guest-details",
			};
			(useBookingStore as any).mockReturnValue(storeWithGuestStep);

			render(<BookingFlow {...mockProps} />);

			const stepIndicators = screen
				.getAllByRole("generic")
				.filter((el) => el.className.includes("border-primary-600"));
			expect(stepIndicators).toHaveLength(1);
		});

		it("shows completed steps with check icons", () => {
			const storeWithPaymentStep = {
				...mockBookingStore,
				currentStep: "payment",
			};
			(useBookingStore as any).mockReturnValue(storeWithPaymentStep);

			render(<BookingFlow {...mockProps} />);

			const checkIcons = screen.getAllByTestId("check-icon");
			expect(checkIcons.length).toBeGreaterThan(0);
		});
	});

	describe("Room Selection Step", () => {
		it("displays selected room information correctly", () => {
			const storeWithRoom = {
				...mockBookingStore,
				selectedRoom: mockRoom,
			};
			(useBookingStore as any).mockReturnValue(storeWithRoom);

			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Deluxe Room")).toBeInTheDocument();
			expect(
				screen.getByText("A spacious room with modern amenities"),
			).toBeInTheDocument();
			expect(screen.getByText("Up to 2 guests")).toBeInTheDocument();
			expect(screen.getByText("Standard")).toBeInTheDocument();
			expect(screen.getByText("$150.00")).toBeInTheDocument();
		});

		it("displays room amenities", () => {
			const storeWithRoom = {
				...mockBookingStore,
				selectedRoom: mockRoom,
			};
			(useBookingStore as any).mockReturnValue(storeWithRoom);

			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("WiFi")).toBeInTheDocument();
			expect(screen.getByText("Air Conditioning")).toBeInTheDocument();
			expect(screen.getByText("Mini Bar")).toBeInTheDocument();
		});

		it("calculates total amount correctly for multiple nights", () => {
			const storeWithRoom = {
				...mockBookingStore,
				selectedRoom: mockRoom,
			};
			(useBookingStore as any).mockReturnValue(storeWithRoom);

			render(<BookingFlow {...mockProps} />);

			// 2 nights * $150 = $300
			expect(screen.getByText("Total: $300.00")).toBeInTheDocument();
			expect(screen.getByText("2 nights")).toBeInTheDocument();
		});

		it("shows no room selected message when room is not available", () => {
			const storeWithoutRoom = {
				...mockBookingStore,
				selectedRoom: null,
			};
			(useBookingStore as any).mockReturnValue(storeWithoutRoom);

			render(<BookingFlow {...mockProps} />);

			expect(
				screen.getByText("No room selected. Please select a room first."),
			).toBeInTheDocument();
		});
	});

	describe("Guest Details Step", () => {
		beforeEach(() => {
			const storeWithGuestStep = {
				...mockBookingStore,
				currentStep: "guest-details",
			};
			(useBookingStore as any).mockReturnValue(storeWithGuestStep);
		});

		it("renders guest details form fields", () => {
			render(<BookingFlow {...mockProps} />);

			expect(
				screen.getByPlaceholderText("Enter first name"),
			).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("Enter last name"),
			).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("Enter email address"),
			).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("Enter phone number"),
			).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("Any special requests or preferences?"),
			).toBeInTheDocument();
		});

		it("calls setGuestDetails when form fields are updated", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const firstNameInput = screen.getByPlaceholderText("Enter first name");
			await user.type(firstNameInput, "John");

			expect(mockBookingStore.setGuestDetails).toHaveBeenCalledWith({
				firstName: "John",
			});
		});

		it("displays validation errors for required fields", () => {
			const storeWithErrors = {
				...mockBookingStore,
				currentStep: "guest-details",
				errors: {
					firstName: "First name is required",
					email: "Please enter a valid email",
				},
			};
			(useBookingStore as any).mockReturnValue(storeWithErrors);

			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("First name is required")).toBeInTheDocument();
			expect(
				screen.getByText("Please enter a valid email"),
			).toBeInTheDocument();
		});

		it("has proper form labels and accessibility attributes", async () => {
			render(<BookingFlow {...mockProps} />);

			const firstNameInput = screen.getByPlaceholderText("Enter first name");
			const firstNameLabel = screen.getByText("First Name *");

			expect(firstNameLabel).toBeInTheDocument();
			expect(firstNameInput).toHaveAttribute("type", "text");
		});
	});

	describe("Payment Step", () => {
		beforeEach(() => {
			const storeWithPaymentStep = {
				...mockBookingStore,
				currentStep: "payment",
				selectedRoom: mockRoom,
			};
			(useBookingStore as any).mockReturnValue(storeWithPaymentStep);
		});

		it("renders payment form fields", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByPlaceholderText("Name on card")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("1234 5678 9012 3456"),
			).toBeInTheDocument();
			expect(screen.getByPlaceholderText("MM/YY")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("123")).toBeInTheDocument();
		});

		it("formats card number input correctly", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const cardNumberInput = screen.getByPlaceholderText(
				"1234 5678 9012 3456",
			);
			await user.type(cardNumberInput, "1234567890123456");

			expect(cardNumberInput).toHaveValue("1234 5678 9012 3456");
		});

		it("formats expiry date input correctly", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const expiryInput = screen.getByPlaceholderText("MM/YY");
			await user.type(expiryInput, "1225");

			expect(expiryInput).toHaveValue("12/25");
		});

		it("limits CVV input length", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const cvvInput = screen.getByPlaceholderText("123");
			await user.type(cvvInput, "12345");

			expect(cvvInput).toHaveValue("1234"); // Should be limited to 4 digits
		});

		it("displays payment summary with correct calculations", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Payment Summary")).toBeInTheDocument();
			expect(screen.getByText("Room Rate (2 nights)")).toBeInTheDocument();
			expect(screen.getByText("$300.00")).toBeInTheDocument(); // Room rate
			expect(screen.getByText("$45.00")).toBeInTheDocument(); // Taxes (15%)
			expect(screen.getByText("$345.00")).toBeInTheDocument(); // Total
		});

		it("renders billing address fields", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Billing Address")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("123 Main Street"),
			).toBeInTheDocument();
			expect(screen.getByPlaceholderText("New York")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("10001")).toBeInTheDocument();
		});
	});

	describe("Confirmation Step", () => {
		beforeEach(() => {
			const storeWithConfirmationStep = {
				...mockBookingStore,
				currentStep: "confirmation",
				selectedRoom: mockRoom,
				guestDetails: {
					firstName: "John",
					lastName: "Doe",
					email: "john.doe@example.com",
					phone: "+1234567890",
					specialRequests: "Late check-in please",
				},
				paymentInfo: {
					...mockBookingStore.paymentInfo,
					cardNumber: "1234567890123456",
					cardholderName: "John Doe",
				},
			};
			(useBookingStore as any).mockReturnValue(storeWithConfirmationStep);
		});

		it("displays booking confirmation header", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Review Your Booking")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Please review all details before confirming your reservation",
				),
			).toBeInTheDocument();
		});

		it("shows hotel and room details", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Hotel & Room Details")).toBeInTheDocument();
			expect(screen.getByText("Test Hotel")).toBeInTheDocument();
			expect(screen.getByText("Deluxe Room")).toBeInTheDocument();
			expect(screen.getByText("Test City, TC")).toBeInTheDocument();
		});

		it("displays guest information", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Guest Information")).toBeInTheDocument();
			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
			expect(screen.getByText("+1234567890")).toBeInTheDocument();
			expect(screen.getByText("Late check-in please")).toBeInTheDocument();
		});

		it("shows payment summary with masked card number", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Payment Summary")).toBeInTheDocument();
			expect(screen.getByText(/\*\*\*\*3456/)).toBeInTheDocument(); // Masked card number
		});

		it("displays terms and conditions", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Terms & Conditions")).toBeInTheDocument();
			expect(
				screen.getByText(/By completing this booking/),
			).toBeInTheDocument();
		});
	});

	describe("Navigation", () => {
		it("shows Continue button for non-final steps", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Continue")).toBeInTheDocument();
			expect(screen.queryByText("Complete Booking")).not.toBeInTheDocument();
		});

		it("shows Complete Booking button on confirmation step", () => {
			const storeWithConfirmationStep = {
				...mockBookingStore,
				currentStep: "confirmation",
			};
			(useBookingStore as any).mockReturnValue(storeWithConfirmationStep);

			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Complete Booking")).toBeInTheDocument();
			expect(screen.queryByText("Continue")).not.toBeInTheDocument();
		});

		it("shows Previous button for non-first steps", () => {
			const storeWithGuestStep = {
				...mockBookingStore,
				currentStep: "guest-details",
			};
			(useBookingStore as any).mockReturnValue(storeWithGuestStep);

			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Previous")).toBeInTheDocument();
		});

		it("does not show Previous button on first step", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.queryByText("Previous")).not.toBeInTheDocument();
		});

		it("calls nextStep when Continue is clicked and validation passes", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const continueButton = screen.getByText("Continue");
			await user.click(continueButton);

			expect(mockBookingStore.validateCurrentStep).toHaveBeenCalled();
			expect(mockBookingStore.nextStep).toHaveBeenCalled();
		});

		it("does not proceed if validation fails", async () => {
			const user = userEvent.setup();
			const storeWithFailedValidation = {
				...mockBookingStore,
				validateCurrentStep: vi.fn().mockReturnValue(false),
			};
			(useBookingStore as any).mockReturnValue(storeWithFailedValidation);

			render(<BookingFlow {...mockProps} />);

			const continueButton = screen.getByText("Continue");
			await user.click(continueButton);

			expect(storeWithFailedValidation.validateCurrentStep).toHaveBeenCalled();
			expect(storeWithFailedValidation.nextStep).not.toHaveBeenCalled();
		});

		it("calls previousStep when Previous is clicked", async () => {
			const user = userEvent.setup();
			const storeWithGuestStep = {
				...mockBookingStore,
				currentStep: "guest-details",
			};
			(useBookingStore as any).mockReturnValue(storeWithGuestStep);

			render(<BookingFlow {...mockProps} />);

			const previousButton = screen.getByText("Previous");
			await user.click(previousButton);

			expect(mockBookingStore.previousStep).toHaveBeenCalled();
		});
	});

	describe("Booking Completion", () => {
		beforeEach(() => {
			const storeWithConfirmationStep = {
				...mockBookingStore,
				currentStep: "confirmation",
				selectedRoom: mockRoom,
			};
			(useBookingStore as any).mockReturnValue(storeWithConfirmationStep);
		});

		it("shows loading state during booking completion", async () => {
			const storeWithLoading = {
				...mockBookingStore,
				currentStep: "confirmation",
				loading: true,
			};
			(useBookingStore as any).mockReturnValue(storeWithLoading);

			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Processing...")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /Processing/ })).toBeDisabled();
		});

		it("calls onBookingComplete with booking ID after successful completion", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const completeButton = screen.getByText("Complete Booking");
			await user.click(completeButton);

			await waitFor(() => {
				expect(mockProps.onBookingComplete).toHaveBeenCalledWith(
					expect.stringMatching(/^BK-\d+-[a-z0-9]+$/),
				);
			});
		});

		it("does not complete booking if validation fails", async () => {
			const user = userEvent.setup();
			const storeWithFailedValidation = {
				...mockBookingStore,
				currentStep: "confirmation",
				validateCurrentStep: vi.fn().mockReturnValue(false),
			};
			(useBookingStore as any).mockReturnValue(storeWithFailedValidation);

			render(<BookingFlow {...mockProps} />);

			const completeButton = screen.getByText("Complete Booking");
			await user.click(completeButton);

			expect(mockProps.onBookingComplete).not.toHaveBeenCalled();
		});
	});

	describe("Cancellation", () => {
		it("shows Cancel button when onCancel prop is provided", () => {
			render(<BookingFlow {...mockProps} />);

			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		it("does not show Cancel button when onCancel prop is not provided", () => {
			const propsWithoutCancel = { ...mockProps };
			delete (propsWithoutCancel as any).onCancel;

			render(<BookingFlow {...propsWithoutCancel} />);

			expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
		});

		it("calls clearBooking and onCancel when Cancel is clicked", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const cancelButton = screen.getByText("Cancel");
			await user.click(cancelButton);

			expect(mockBookingStore.clearBooking).toHaveBeenCalled();
			expect(mockProps.onCancel).toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("should not have accessibility violations", async () => {
			const { container } = render(<BookingFlow {...mockProps} />);
			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("has proper ARIA labels and roles", () => {
			render(<BookingFlow {...mockProps} />);

			const form = screen.getByRole("generic"); // Card container
			expect(form).toBeInTheDocument();

			// Check that interactive elements have proper accessibility
			const continueButton = screen.getByRole("button", { name: /Continue/ });
			expect(continueButton).toBeInTheDocument();
		});

		it("supports keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<BookingFlow {...mockProps} />);

			const continueButton = screen.getByRole("button", { name: /Continue/ });

			// Focus should be on the continue button
			await user.tab();
			expect(continueButton).toHaveFocus();
		});
	});

	describe("Error Handling", () => {
		it("handles image loading errors gracefully", () => {
			const storeWithRoom = {
				...mockBookingStore,
				selectedRoom: mockRoom,
			};
			(useBookingStore as any).mockReturnValue(storeWithRoom);

			render(<BookingFlow {...mockProps} />);

			const roomImage = screen.getByAltText("Deluxe Room");

			// Simulate image loading error
			fireEvent.error(roomImage);

			expect(roomImage).toHaveAttribute("src", "/placeholder-room.jpg");
		});

		it("handles missing room data gracefully", () => {
			const storeWithoutRoom = {
				...mockBookingStore,
				selectedRoom: null,
			};
			(useBookingStore as any).mockReturnValue(storeWithoutRoom);

			render(<BookingFlow {...mockProps} />);

			expect(
				screen.getByText("No room selected. Please select a room first."),
			).toBeInTheDocument();
		});
	});
});
