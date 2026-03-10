import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type Booking,
	type BookingData,
	bookingService,
} from "@/services/bookingService";
import {
	MockDataGenerator,
	mockApiResponses,
} from "../fixtures/mockDataGenerators";

// Mock dependencies
vi.mock("axios", () => ({
	default: {
		post: vi.fn(),
		get: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
	},
}));

vi.mock("@/utils/logger", () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		dismiss: vi.fn(),
	},
}));

vi.mock("@/services/notificationService", () => ({
	notificationService: {
		scheduleBookingReminder: vi.fn(),
		sendBookingConfirmation: vi.fn(),
	},
}));

const mockedAxios = axios as any;

describe("BookingService", () => {
	const mockBookingData: BookingData = {
		hotelId: "hotel-123",
		hotelName: "Test Hotel",
		hotelImage: "test-hotel.jpg",
		roomType: "Deluxe Room",
		roomId: "room-456",
		checkIn: "2024-12-01",
		checkOut: "2024-12-03",
		nights: 2,
		guests: {
			adults: 2,
			children: 0,
		},
		guestInfo: {
			firstName: "John",
			lastName: "Doe",
			email: "john.doe@example.com",
			phone: "+1234567890",
		},
		specialRequests: "Late check-in please",
		totalAmount: 500,
		currency: "USD",
		paymentToken: "tok_test_123",
		userId: "user-789",
	};

	const mockBooking: Booking = {
		id: "booking-123",
		confirmationNumber: "CONF456",
		userId: "user-789",
		userEmail: "john.doe@example.com",
		hotelId: "hotel-123",
		hotelName: "Test Hotel",
		hotelImage: "test-hotel.jpg",
		hotelCity: "Test City",
		roomType: "Deluxe Room",
		roomId: "room-456",
		checkIn: "2024-12-01",
		checkOut: "2024-12-03",
		nights: 2,
		guests: {
			adults: 2,
			children: 0,
		},
		guestInfo: {
			firstName: "John",
			lastName: "Doe",
			email: "john.doe@example.com",
			phone: "+1234567890",
		},
		specialRequests: "Late check-in please",
		totalAmount: 500,
		currency: "USD",
		status: "confirmed",
		paymentStatus: "completed",
		paymentId: "pay_123",
		createdAt: "2024-12-01T10:00:00Z",
		updatedAt: "2024-12-01T10:00:00Z",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe("createBooking", () => {
		it("should create booking successfully", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			const result = await bookingService.createBooking(mockBookingData);

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/bookings", {
				...mockBookingData,
				metadata: {
					userAgent: expect.any(String),
					timestamp: expect.any(String),
				},
			});

			expect(result).toEqual(mockBooking);
		});

		it("should handle API error response", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					success: false,
					error: "Room not available",
				},
			});

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow("Room not available");
		});

		it("should handle network error", async () => {
			const networkError = new Error("Network Error");
			mockedAxios.post.mockRejectedValue(networkError);

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow("Failed to create booking. Please try again.");
		});

		it("should validate required booking data", async () => {
			const invalidBookingData = {
				...mockBookingData,
				hotelId: "",
				guestInfo: {
					...mockBookingData.guestInfo,
					email: "invalid-email",
				},
			};

			await expect(
				bookingService.createBooking(invalidBookingData),
			).rejects.toThrow("Invalid booking data");
		});

		it("should handle payment processing failure", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					success: false,
					error: "Payment failed",
					code: "PAYMENT_DECLINED",
				},
			});

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow("Payment failed");
		});

		it("should include correct metadata", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			await bookingService.createBooking(mockBookingData);

			const callArgs = mockedAxios.post.mock.calls[0][1];
			expect(callArgs.metadata).toMatchObject({
				userAgent: expect.any(String),
				timestamp: expect.stringMatching(
					/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
				),
			});
		});
	});

	describe("getBooking", () => {
		it("should retrieve booking by ID", async () => {
			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			const result = await bookingService.getBooking("booking-123");

			expect(mockedAxios.get).toHaveBeenCalledWith("/api/bookings/booking-123");
			expect(result).toEqual(mockBooking);
		});

		it("should handle booking not found", async () => {
			mockedAxios.get.mockResolvedValue({
				data: {
					success: false,
					error: "Booking not found",
				},
			});

			await expect(
				bookingService.getBooking("invalid-booking-id"),
			).rejects.toThrow("Booking not found");
		});

		it("should retrieve booking by confirmation number", async () => {
			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			const result = await bookingService.getBookingByConfirmation("CONF456");

			expect(mockedAxios.get).toHaveBeenCalledWith(
				"/api/bookings/confirmation/CONF456",
			);
			expect(result).toEqual(mockBooking);
		});
	});

	describe("getUserBookings", () => {
		it("should retrieve user bookings with pagination", async () => {
			const mockBookings = [mockBooking, { ...mockBooking, id: "booking-456" }];

			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					bookings: mockBookings,
					pagination: {
						page: 1,
						limit: 10,
						total: 2,
						totalPages: 1,
						hasNext: false,
						hasPrev: false,
					},
				},
			});

			const result = await bookingService.getUserBookings("user-789");

			expect(mockedAxios.get).toHaveBeenCalledWith(
				"/api/bookings/user/user-789?page=1&limit=10",
			);
			expect(result.bookings).toEqual(mockBookings);
			expect(result.pagination.total).toBe(2);
		});

		it("should handle custom pagination parameters", async () => {
			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					bookings: [mockBooking],
					pagination: {
						page: 2,
						limit: 5,
						total: 10,
						totalPages: 2,
						hasNext: false,
						hasPrev: true,
					},
				},
			});

			await bookingService.getUserBookings("user-789", 2, 5);

			expect(mockedAxios.get).toHaveBeenCalledWith(
				"/api/bookings/user/user-789?page=2&limit=5",
			);
		});

		it("should filter bookings by status", async () => {
			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					bookings: [mockBooking],
					pagination: {
						page: 1,
						limit: 10,
						total: 1,
						totalPages: 1,
						hasNext: false,
						hasPrev: false,
					},
				},
			});

			await bookingService.getUserBookings("user-789", 1, 10, "confirmed");

			expect(mockedAxios.get).toHaveBeenCalledWith(
				"/api/bookings/user/user-789?page=1&limit=10&status=confirmed",
			);
		});
	});

	describe("updateBooking", () => {
		it("should update booking successfully", async () => {
			const updatedBooking = {
				...mockBooking,
				specialRequests: "Updated special requests",
				updatedAt: "2024-12-01T11:00:00Z",
			};

			mockedAxios.put.mockResolvedValue({
				data: {
					success: true,
					booking: updatedBooking,
				},
			});

			const updateData = { specialRequests: "Updated special requests" };
			const result = await bookingService.updateBooking(
				"booking-123",
				updateData,
			);

			expect(mockedAxios.put).toHaveBeenCalledWith(
				"/api/bookings/booking-123",
				updateData,
			);
			expect(result).toEqual(updatedBooking);
		});

		it("should prevent updating immutable fields", async () => {
			const updateData = {
				id: "new-id",
				confirmationNumber: "NEW-CONF",
				totalAmount: 999,
			};

			await expect(
				bookingService.updateBooking("booking-123", updateData),
			).rejects.toThrow("Cannot update immutable booking fields");
		});

		it("should handle booking update failure", async () => {
			mockedAxios.put.mockResolvedValue({
				data: {
					success: false,
					error: "Cannot modify confirmed booking",
				},
			});

			await expect(
				bookingService.updateBooking("booking-123", {
					specialRequests: "New requests",
				}),
			).rejects.toThrow("Cannot modify confirmed booking");
		});
	});

	describe("cancelBooking", () => {
		it("should cancel booking successfully", async () => {
			const cancelledBooking = {
				...mockBooking,
				status: "cancelled",
				cancellationReason: "Customer request",
				cancelledAt: "2024-12-01T12:00:00Z",
			};

			mockedAxios.put.mockResolvedValue({
				data: {
					success: true,
					booking: cancelledBooking,
					refundAmount: 450, // $50 cancellation fee
				},
			});

			const result = await bookingService.cancelBooking(
				"booking-123",
				"Customer request",
			);

			expect(mockedAxios.put).toHaveBeenCalledWith(
				"/api/bookings/booking-123/cancel",
				{
					reason: "Customer request",
				},
			);

			expect(result.booking.status).toBe("cancelled");
			expect(result.refundAmount).toBe(450);
		});

		it("should handle cancellation policy restrictions", async () => {
			mockedAxios.put.mockResolvedValue({
				data: {
					success: false,
					error: "Cancellation not allowed within 24 hours of check-in",
					code: "CANCELLATION_POLICY_VIOLATION",
				},
			});

			await expect(
				bookingService.cancelBooking("booking-123", "Emergency"),
			).rejects.toThrow("Cancellation not allowed within 24 hours of check-in");
		});

		it("should calculate correct refund amount", async () => {
			const cancellationPolicy = {
				refundPercentage: 80,
				cancellationFee: 50,
				freecancellationHours: 48,
			};

			mockedAxios.put.mockResolvedValue({
				data: {
					success: true,
					booking: { ...mockBooking, status: "cancelled" },
					refundAmount: 350, // 80% of $500 - $50 fee
					policy: cancellationPolicy,
				},
			});

			const result = await bookingService.cancelBooking(
				"booking-123",
				"Change of plans",
			);

			expect(result.refundAmount).toBe(350);
			expect(result.policy).toEqual(cancellationPolicy);
		});
	});

	describe("getBookingHistory", () => {
		it("should retrieve booking history with filters", async () => {
			const historyData = {
				bookings: [mockBooking],
				summary: {
					totalBookings: 1,
					totalSpent: 500,
					averageRating: 4.5,
					favoriteDestination: "Test City",
				},
				filters: {
					dateRange: {
						start: "2024-01-01",
						end: "2024-12-31",
					},
					status: "all",
				},
			};

			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					...historyData,
				},
			});

			const result = await bookingService.getBookingHistory("user-789", {
				startDate: "2024-01-01",
				endDate: "2024-12-31",
			});

			expect(mockedAxios.get).toHaveBeenCalledWith(
				"/api/bookings/user/user-789/history?startDate=2024-01-01&endDate=2024-12-31",
			);

			expect(result).toEqual(historyData);
		});

		it("should handle date range filters", async () => {
			mockedAxios.get.mockResolvedValue({
				data: {
					success: true,
					bookings: [],
					summary: { totalBookings: 0, totalSpent: 0 },
				},
			});

			await bookingService.getBookingHistory("user-789", {
				startDate: "2024-06-01",
				endDate: "2024-06-30",
				status: "completed",
			});

			expect(mockedAxios.get).toHaveBeenCalledWith(
				"/api/bookings/user/user-789/history?startDate=2024-06-01&endDate=2024-06-30&status=completed",
			);
		});
	});

	describe("checkAvailability", () => {
		it("should check room availability", async () => {
			const availabilityData = {
				available: true,
				rooms: [
					{
						roomId: "room-456",
						available: true,
						price: 250,
						originalPrice: 280,
						discount: 30,
					},
				],
				restrictions: [],
				policies: {
					checkIn: "15:00",
					checkOut: "11:00",
					minimumStay: 1,
					maximumStay: 30,
				},
			};

			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					...availabilityData,
				},
			});

			const searchParams = {
				hotelId: "hotel-123",
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
				guests: { adults: 2, children: 0 },
			};

			const result = await bookingService.checkAvailability(searchParams);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"/api/bookings/availability",
				searchParams,
			);
			expect(result).toEqual(availabilityData);
		});

		it("should handle no availability", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					available: false,
					rooms: [],
					reason: "No rooms available for selected dates",
				},
			});

			const result = await bookingService.checkAvailability({
				hotelId: "hotel-123",
				checkIn: "2024-12-25",
				checkOut: "2024-12-26",
				guests: { adults: 4, children: 2 },
			});

			expect(result.available).toBe(false);
			expect(result.reason).toBe("No rooms available for selected dates");
		});
	});

	describe("Validation", () => {
		it("should validate email format", () => {
			const invalidBookingData = {
				...mockBookingData,
				guestInfo: {
					...mockBookingData.guestInfo,
					email: "invalid-email",
				},
			};

			expect(() =>
				bookingService.validateBookingData(invalidBookingData),
			).toThrow("Invalid email format");
		});

		it("should validate date range", () => {
			const invalidBookingData = {
				...mockBookingData,
				checkIn: "2024-12-03",
				checkOut: "2024-12-01",
			};

			expect(() =>
				bookingService.validateBookingData(invalidBookingData),
			).toThrow("Check-out date must be after check-in date");
		});

		it("should validate guest count", () => {
			const invalidBookingData = {
				...mockBookingData,
				guests: {
					adults: 0,
					children: 0,
				},
			};

			expect(() =>
				bookingService.validateBookingData(invalidBookingData),
			).toThrow("At least one adult guest is required");
		});

		it("should validate required fields", () => {
			const invalidBookingData = {
				...mockBookingData,
				hotelId: "",
				guestInfo: {
					...mockBookingData.guestInfo,
					firstName: "",
					lastName: "",
				},
			};

			expect(() =>
				bookingService.validateBookingData(invalidBookingData),
			).toThrow("Missing required booking information");
		});

		it("should validate phone number format", () => {
			const invalidBookingData = {
				...mockBookingData,
				guestInfo: {
					...mockBookingData.guestInfo,
					phone: "123",
				},
			};

			expect(() =>
				bookingService.validateBookingData(invalidBookingData),
			).toThrow("Invalid phone number format");
		});
	});

	describe("Error Handling", () => {
		it("should handle timeout errors", async () => {
			const timeoutError = new Error("Request timeout");
			timeoutError.name = "TimeoutError";
			mockedAxios.post.mockRejectedValue(timeoutError);

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow("Request timed out. Please try again.");
		});

		it("should handle network connectivity issues", async () => {
			const networkError = new Error("ECONNREFUSED");
			mockedAxios.post.mockRejectedValue(networkError);

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow("Network error. Please check your connection.");
		});

		it("should handle server errors", async () => {
			const serverError = {
				response: {
					status: 500,
					data: {
						error: "Internal server error",
					},
				},
			};
			mockedAxios.post.mockRejectedValue(serverError);

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow("Server error. Please try again later.");
		});

		it("should handle rate limiting", async () => {
			const rateLimitError = {
				response: {
					status: 429,
					data: {
						error: "Rate limit exceeded",
						retryAfter: 60,
					},
				},
			};
			mockedAxios.post.mockRejectedValue(rateLimitError);

			await expect(
				bookingService.createBooking(mockBookingData),
			).rejects.toThrow(
				"Too many requests. Please wait a moment and try again.",
			);
		});
	});

	describe("Edge Cases", () => {
		it("should handle extremely long guest names", async () => {
			const longNameBookingData = {
				...mockBookingData,
				guestInfo: {
					...mockBookingData.guestInfo,
					firstName: "A".repeat(100),
					lastName: "B".repeat(100),
				},
			};

			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			await expect(
				bookingService.createBooking(longNameBookingData),
			).resolves.toBeDefined();
		});

		it("should handle special characters in guest information", async () => {
			const specialCharBookingData = {
				...mockBookingData,
				guestInfo: {
					firstName: "José",
					lastName: "O'Connor-Smith",
					email: "josé.oconnor@example.com",
					phone: "+1 (555) 123-4567",
				},
			};

			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			await expect(
				bookingService.createBooking(specialCharBookingData),
			).resolves.toBeDefined();
		});

		it("should handle very long special requests", async () => {
			const longRequestBookingData = {
				...mockBookingData,
				specialRequests: "A".repeat(1000),
			};

			expect(() =>
				bookingService.validateBookingData(longRequestBookingData),
			).toThrow("Special requests too long");
		});

		it("should handle booking far in the future", async () => {
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 2);

			const futureBookingData = {
				...mockBookingData,
				checkIn: futureDate.toISOString().split("T")[0],
				checkOut: new Date(futureDate.getTime() + 86400000)
					.toISOString()
					.split("T")[0],
			};

			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			await expect(
				bookingService.createBooking(futureBookingData),
			).resolves.toBeDefined();
		});

		it("should handle maximum guest capacity", async () => {
			const maxGuestBookingData = {
				...mockBookingData,
				guests: {
					adults: 10,
					children: 8,
				},
			};

			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			await expect(
				bookingService.createBooking(maxGuestBookingData),
			).resolves.toBeDefined();
		});
	});

	describe("Performance", () => {
		it("should handle concurrent booking requests", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			const bookingPromises = Array.from({ length: 5 }, () =>
				bookingService.createBooking({
					...mockBookingData,
					guestInfo: {
						...mockBookingData.guestInfo,
						email: `test${Math.random()}@example.com`,
					},
				}),
			);

			const results = await Promise.all(bookingPromises);
			expect(results).toHaveLength(5);
			expect(mockedAxios.post).toHaveBeenCalledTimes(5);
		});

		it("should handle large booking data", async () => {
			const largeBookingData = {
				...mockBookingData,
				specialRequests: "A".repeat(500),
				guestInfo: {
					...mockBookingData.guestInfo,
					firstName: "John".repeat(10),
					lastName: "Doe".repeat(10),
				},
			};

			mockedAxios.post.mockResolvedValue({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			const startTime = performance.now();
			await bookingService.createBooking(largeBookingData);
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});
	});

	describe("Integration Scenarios", () => {
		it("should handle complete booking flow with payment", async () => {
			// Step 1: Check availability
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					success: true,
					available: true,
					rooms: [{ roomId: "room-456", available: true, price: 250 }],
				},
			});

			// Step 2: Create booking
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			// Check availability first
			const availability = await bookingService.checkAvailability({
				hotelId: "hotel-123",
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
				guests: { adults: 2, children: 0 },
			});

			expect(availability.available).toBe(true);

			// Create booking
			const booking = await bookingService.createBooking(mockBookingData);

			expect(booking).toEqual(mockBooking);
			expect(mockedAxios.post).toHaveBeenCalledTimes(2);
		});

		it("should handle booking modification flow", async () => {
			// Step 1: Get existing booking
			mockedAxios.get.mockResolvedValueOnce({
				data: {
					success: true,
					booking: mockBooking,
				},
			});

			// Step 2: Update booking
			mockedAxios.put.mockResolvedValueOnce({
				data: {
					success: true,
					booking: {
						...mockBooking,
						specialRequests: "Updated requests",
					},
				},
			});

			const originalBooking = await bookingService.getBooking("booking-123");
			const updatedBooking = await bookingService.updateBooking("booking-123", {
				specialRequests: "Updated requests",
			});

			expect(originalBooking.id).toBe("booking-123");
			expect(updatedBooking.specialRequests).toBe("Updated requests");
		});

		it("should handle booking cancellation with refund", async () => {
			// Step 1: Cancel booking
			mockedAxios.put.mockResolvedValueOnce({
				data: {
					success: true,
					booking: { ...mockBooking, status: "cancelled" },
					refundAmount: 450,
					refundId: "refund-123",
				},
			});

			const cancellationResult = await bookingService.cancelBooking(
				"booking-123",
				"Travel plans changed",
			);

			expect(cancellationResult.booking.status).toBe("cancelled");
			expect(cancellationResult.refundAmount).toBe(450);
			expect(cancellationResult.refundId).toBe("refund-123");
		});
	});
});
