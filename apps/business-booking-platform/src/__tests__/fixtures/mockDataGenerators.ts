import { vi } from "vitest";
import type { GuestDetails, PaymentInfo } from "@/store/bookingStore";
import type {
	Booking,
	Hotel,
	PassionScore,
	Room,
	SearchFilters,
} from "@/types/api";

// MOCK DATA GENERATORS
// Comprehensive mock data generators for testing all scenarios

export class MockDataGenerator {
	// Generate mock hotels with various configurations
	static generateHotel(overrides: Partial<Hotel> = {}): Hotel {
		const baseId =
			overrides.id || `hotel-${Math.random().toString(36).substr(2, 9)}`;
		const starRating = overrides.rating || Math.random() * 2 + 3; // 3-5 stars

		return {
			id: baseId,
			name: overrides.name || `Hotel ${baseId.slice(-5)}`,
			description:
				overrides.description ||
				"A wonderful hotel with great amenities and excellent service.",
			location: {
				address: "123 Test Street",
				city: "Test City",
				country: "TC",
				coordinates: {
					lat: 40.7128 + (Math.random() - 0.5) * 0.1,
					lng: -74.006 + (Math.random() - 0.5) * 0.1,
				},
				neighborhood: "Downtown",
				...overrides.location,
			},
			rating: starRating,
			reviewCount: Math.floor(Math.random() * 2000) + 100,
			priceRange: {
				min: Math.floor(Math.random() * 100) + 50,
				max: Math.floor(Math.random() * 300) + 200,
				avgNightly: Math.floor(Math.random() * 200) + 100,
				currency: "USD",
				...overrides.priceRange,
			},
			images: [
				{
					id: `img-${baseId}`,
					url: `https://example.com/hotel-${baseId}.jpg`,
					alt: overrides.name || `Hotel ${baseId}`,
					category: "exterior" as const,
					isPrimary: true,
				},
			],
			amenities: [
				{ id: "wifi", name: "WiFi", category: "connectivity", icon: "📶" },
				{ id: "pool", name: "Pool", category: "recreation", icon: "🏊" },
				...(!overrides.amenities ? [] : overrides.amenities),
			],
			availability: {
				available: true,
				lastChecked: new Date().toISOString(),
				lowAvailability: Math.random() < 0.3,
				priceChange:
					Math.random() < 0.5
						? undefined
						: Math.floor((Math.random() - 0.5) * 50),
				...overrides.availability,
			},
			passionScore: MockDataGenerator.generatePassionScore(
				overrides.passionScore,
			),
			sustainabilityScore: Math.random() * 0.5 + 0.5, // 0.5-1.0
			virtualTourUrl: `https://example.com/tour-${baseId}`,
			...overrides,
		};
	}

	// Generate realistic passion scores
	static generatePassionScore(
		overrides: Partial<PassionScore> = {},
	): PassionScore {
		const passions = [
			"luxury-indulgence",
			"wellness-retreat",
			"romantic-escape",
			"adventure-seeker",
			"cultural-explorer",
			"budget-conscious",
			"family-fun",
			"business-traveler",
			"eco-conscious",
			"foodie-experience",
		] as const;

		const scores: PassionScore = {} as PassionScore;

		// Generate random scores with some having higher values
		passions.forEach((passion) => {
			scores[passion] =
				overrides[passion] ??
				(Math.random() < 0.3 ? Math.random() * 0.7 + 0.3 : Math.random() * 0.3);
		});

		return scores;
	}

	// Generate various hotel types for different test scenarios
	static generateLuxuryHotel(): Hotel {
		return MockDataGenerator.generateHotel({
			name: "The Grand Luxury Resort",
			rating: 4.8,
			priceRange: { min: 400, max: 800, avgNightly: 600, currency: "USD" },
			amenities: [
				{ id: "spa", name: "Spa", category: "wellness", icon: "🧖" },
				{
					id: "restaurant",
					name: "Fine Dining",
					category: "dining",
					icon: "🍽️",
				},
				{ id: "concierge", name: "Concierge", category: "service", icon: "🛎️" },
				{ id: "valet", name: "Valet Parking", category: "service", icon: "🚗" },
			],
			passionScore: {
				"luxury-indulgence": 0.95,
				"romantic-escape": 0.8,
				"foodie-experience": 0.9,
				"wellness-retreat": 0.7,
				"cultural-explorer": 0.6,
				"adventure-seeker": 0.2,
				"budget-conscious": 0.1,
				"family-fun": 0.4,
				"business-traveler": 0.7,
				"eco-conscious": 0.5,
			},
			sustainabilityScore: 0.8,
		});
	}

	static generateBudgetHotel(): Hotel {
		return MockDataGenerator.generateHotel({
			name: "Economy Stay Inn",
			rating: 3.2,
			priceRange: { min: 45, max: 85, avgNightly: 65, currency: "USD" },
			amenities: [
				{ id: "wifi", name: "WiFi", category: "connectivity", icon: "📶" },
				{ id: "parking", name: "Parking", category: "service", icon: "🅿️" },
			],
			passionScore: {
				"budget-conscious": 0.9,
				"business-traveler": 0.6,
				"family-fun": 0.5,
				"luxury-indulgence": 0.1,
				"romantic-escape": 0.2,
				"wellness-retreat": 0.2,
				"adventure-seeker": 0.4,
				"cultural-explorer": 0.4,
				"eco-conscious": 0.3,
				"foodie-experience": 0.2,
			},
			sustainabilityScore: 0.4,
		});
	}

	static generateFamilyHotel(): Hotel {
		return MockDataGenerator.generateHotel({
			name: "Family Fun Resort",
			rating: 4.3,
			priceRange: { min: 180, max: 280, avgNightly: 230, currency: "USD" },
			amenities: [
				{ id: "pool", name: "Kids Pool", category: "recreation", icon: "🏊" },
				{
					id: "playground",
					name: "Playground",
					category: "recreation",
					icon: "🎪",
				},
				{
					id: "restaurant",
					name: "Family Restaurant",
					category: "dining",
					icon: "🍽️",
				},
				{
					id: "babysitting",
					name: "Babysitting",
					category: "service",
					icon: "👶",
				},
			],
			passionScore: {
				"family-fun": 0.95,
				"adventure-seeker": 0.7,
				"budget-conscious": 0.6,
				"wellness-retreat": 0.5,
				"cultural-explorer": 0.5,
				"luxury-indulgence": 0.4,
				"romantic-escape": 0.3,
				"business-traveler": 0.3,
				"eco-conscious": 0.4,
				"foodie-experience": 0.6,
			},
			sustainabilityScore: 0.6,
		});
	}

	// Generate mock rooms
	static generateRoom(overrides: Partial<Room> = {}): Room {
		const roomTypes = ["standard", "deluxe", "suite", "penthouse"];
		const bedTypes = ["twin", "queen", "king"];

		return {
			id: overrides.id || `room-${Math.random().toString(36).substr(2, 9)}`,
			name: overrides.name || "Standard Room",
			type:
				overrides.type ||
				(roomTypes[Math.floor(Math.random() * roomTypes.length)] as any),
			capacity: overrides.capacity || Math.floor(Math.random() * 4) + 1,
			price: overrides.price || Math.floor(Math.random() * 300) + 100,
			currency: overrides.currency || "USD",
			amenities: overrides.amenities || ["WiFi", "AC", "TV"],
			images: overrides.images || [
				`room-${Math.random().toString(36).substr(2, 5)}.jpg`,
			],
			availability: overrides.availability ?? true,
			description:
				overrides.description || "A comfortable room with modern amenities.",
			bedType: bedTypes[Math.floor(Math.random() * bedTypes.length)] as any,
			size: Math.floor(Math.random() * 200) + 200, // 200-400 sq ft
			maxOccupancy: overrides.capacity || Math.floor(Math.random() * 4) + 2,
			smokingAllowed: Math.random() < 0.2, // 20% smoking rooms
			...overrides,
		};
	}

	// Generate mock bookings
	static generateBooking(overrides: Partial<Booking> = {}): Booking {
		const checkIn = new Date();
		checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 30));
		const checkOut = new Date(checkIn);
		checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 7) + 1);

		return {
			id: overrides.id || `booking-${Math.random().toString(36).substr(2, 9)}`,
			hotelId: overrides.hotelId || "hotel-test",
			roomId: overrides.roomId || "room-test",
			checkIn: overrides.checkIn || checkIn.toISOString().split("T")[0],
			checkOut: overrides.checkOut || checkOut.toISOString().split("T")[0],
			guests: overrides.guests || { adults: 2, children: 0, rooms: 1 },
			totalAmount:
				overrides.totalAmount || Math.floor(Math.random() * 1000) + 200,
			currency: overrides.currency || "USD",
			status: overrides.status || "confirmed",
			paymentStatus: overrides.paymentStatus || "completed",
			createdAt: overrides.createdAt || new Date().toISOString(),
			guestDetails:
				overrides.guestDetails || MockDataGenerator.generateGuestDetails(),
			...overrides,
		};
	}

	// Generate mock guest details
	static generateGuestDetails(
		overrides: Partial<GuestDetails> = {},
	): GuestDetails {
		const firstNames = [
			"John",
			"Jane",
			"Michael",
			"Sarah",
			"David",
			"Emma",
			"Chris",
			"Lisa",
		];
		const lastNames = [
			"Smith",
			"Johnson",
			"Williams",
			"Brown",
			"Jones",
			"Garcia",
			"Miller",
			"Davis",
		];

		return {
			firstName:
				overrides.firstName ||
				firstNames[Math.floor(Math.random() * firstNames.length)],
			lastName:
				overrides.lastName ||
				lastNames[Math.floor(Math.random() * lastNames.length)],
			email:
				overrides.email ||
				`user${Math.random().toString(36).substr(2, 5)}@example.com`,
			phone:
				overrides.phone ||
				`+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
			adults: overrides.adults || 2,
			children: overrides.children || 0,
			specialRequests: overrides.specialRequests || "",
			preferences: {
				bedType: "any" as const,
				floor: "any" as const,
				roomType: "any" as const,
				smokingAllowed: false,
				...overrides.preferences,
			},
			...overrides,
		};
	}

	// Generate mock payment info
	static generatePaymentInfo(
		overrides: Partial<PaymentInfo> = {},
	): PaymentInfo {
		return {
			cardNumber: overrides.cardNumber || "4242424242424242",
			expiryDate: overrides.expiryDate || "12/25",
			cvv: overrides.cvv || "123",
			cardholderName: overrides.cardholderName || "John Doe",
			billingAddress: {
				street: "123 Main St",
				city: "New York",
				state: "NY",
				zipCode: "10001",
				country: "US",
				...overrides.billingAddress,
			},
			saveCard: overrides.saveCard ?? false,
			...overrides,
		};
	}

	// Generate search filters for various scenarios
	static generateSearchFilters(
		overrides: Partial<SearchFilters> = {},
	): SearchFilters {
		return {
			priceRange: overrides.priceRange || [0, 1000],
			starRating: overrides.starRating || [],
			amenities: overrides.amenities || [],
			location: overrides.location || {},
			accessibility: {
				wheelchairAccessible: false,
				hearingAccessible: false,
				visualAccessible: false,
				...overrides.accessibility,
			},
			sustainability: overrides.sustainability ?? false,
			passions: overrides.passions || [],
			...overrides,
		};
	}

	// Generate edge case scenarios
	static generateEdgeCaseHotels() {
		return {
			// Hotel with minimal data
			minimal: MockDataGenerator.generateHotel({
				name: "Minimal Hotel",
				amenities: [],
				images: [],
				description: "",
			}),

			// Hotel with maximum data
			maximal: MockDataGenerator.generateHotel({
				name: "Maximal Luxury Resort & Spa Experience",
				description:
					"An extraordinary luxury resort with world-class amenities, exceptional service, and breathtaking views that create unforgettable memories for our distinguished guests.",
				amenities: [
					{ id: "wifi", name: "WiFi", category: "connectivity", icon: "📶" },
					{ id: "spa", name: "Spa", category: "wellness", icon: "🧖" },
					{ id: "pool", name: "Pool", category: "recreation", icon: "🏊" },
					{
						id: "gym",
						name: "Fitness Center",
						category: "fitness",
						icon: "💪",
					},
					{
						id: "restaurant",
						name: "Fine Dining",
						category: "dining",
						icon: "🍽️",
					},
					{ id: "bar", name: "Cocktail Bar", category: "dining", icon: "🍸" },
					{
						id: "concierge",
						name: "Concierge",
						category: "service",
						icon: "🛎️",
					},
					{
						id: "valet",
						name: "Valet Parking",
						category: "service",
						icon: "🚗",
					},
					{
						id: "business",
						name: "Business Center",
						category: "business",
						icon: "💼",
					},
					{
						id: "meeting",
						name: "Meeting Rooms",
						category: "business",
						icon: "🏢",
					},
				],
				rating: 4.9,
				reviewCount: 5000,
				priceRange: { min: 800, max: 2000, avgNightly: 1200, currency: "USD" },
			}),

			// Hotel with extreme ratings
			poorRating: MockDataGenerator.generateHotel({
				name: "Poor Rating Hotel",
				rating: 1.5,
				reviewCount: 10,
				priceRange: { min: 20, max: 40, avgNightly: 30, currency: "USD" },
			}),

			perfectRating: MockDataGenerator.generateHotel({
				name: "Perfect Rating Hotel",
				rating: 5.0,
				reviewCount: 1000,
				priceRange: { min: 500, max: 1000, avgNightly: 750, currency: "USD" },
			}),

			// Hotel with special characters and unicode
			specialChars: MockDataGenerator.generateHotel({
				name: "Château & Resort [Special-Edition] 2024",
				location: {
					address: "123 Élite Street, Apt #5",
					city: "São Paulo",
					country: "Brasil",
					coordinates: { lat: -23.5505, lng: -46.6333 },
					neighborhood: "Centro Histórico",
				},
			}),
		};
	}

	// Generate performance test data
	static generateLargeHotelDataset(count = 100): Hotel[] {
		return Array.from({ length: count }, (_, i) =>
			MockDataGenerator.generateHotel({
				id: `perf-hotel-${i.toString().padStart(3, "0")}`,
				name: `Performance Test Hotel ${i + 1}`,
			}),
		);
	}

	// Generate error scenarios
	static generateErrorScenarios() {
		return {
			// Hotel with invalid data
			invalidData: {
				id: "",
				name: "",
				rating: -1,
				priceRange: { min: -100, max: -50, avgNightly: -75, currency: "" },
			},

			// Hotel with missing required fields
			missingFields: {
				id: "missing-fields-hotel",
				// Missing name, location, etc.
			},

			// Hotel with extremely long strings
			longStrings: MockDataGenerator.generateHotel({
				name: "A".repeat(500),
				description: "B".repeat(2000),
			}),

			// Hotel with malformed coordinates
			invalidCoordinates: MockDataGenerator.generateHotel({
				location: {
					address: "123 Test St",
					city: "Test City",
					country: "TC",
					coordinates: { lat: 999, lng: -999 },
					neighborhood: "Test",
				},
			}),
		};
	}
}

// MOCK API RESPONSES
export const mockApiResponses = {
	searchSuccess: {
		success: true,
		data: {
			hotels: MockDataGenerator.generateLargeHotelDataset(10),
			pagination: {
				page: 1,
				limit: 10,
				total: 250,
				totalPages: 25,
				hasNext: true,
				hasPrev: false,
			},
		},
	},

	searchEmpty: {
		success: true,
		data: {
			hotels: [],
			pagination: {
				page: 1,
				limit: 10,
				total: 0,
				totalPages: 0,
				hasNext: false,
				hasPrev: false,
			},
		},
	},

	searchError: {
		success: false,
		error: "Search service temporarily unavailable",
		code: "SERVICE_UNAVAILABLE",
	},

	paymentSuccess: {
		success: true,
		id: "pi_test_success",
		clientSecret: "pi_test_success_secret",
		amount: 50000,
		currency: "USD",
	},

	paymentFailure: {
		success: false,
		error: "Your card was declined.",
		code: "CARD_DECLINED",
	},

	bookingSuccess: {
		success: true,
		data: MockDataGenerator.generateBooking({
			id: "booking-success-test",
			status: "confirmed",
		}),
	},

	aiProcessingSuccess: {
		success: true,
		data: {
			intent: "search_hotels",
			originalQuery: "Luxury hotel in Paris for next weekend",
			extractedDetails: {
				location: "Paris, France",
				dates: {
					checkIn: "2024-12-07",
					checkOut: "2024-12-09",
				},
				guests: {
					adults: 2,
					children: 0,
					rooms: 1,
				},
				preferences: ["luxury", "romantic"],
				budget: {
					min: 300,
					max: 800,
					currency: "USD",
				},
			},
			confidence: 0.92,
		},
	},
};

// HELPER FUNCTIONS FOR TESTS
export const testHelpers = {
	// Wait for next tick
	waitForNextTick: () => new Promise((resolve) => setTimeout(resolve, 0)),

	// Create mock fetch response
	createMockResponse: (data: any, status = 200) => {
		return Promise.resolve({
			ok: status >= 200 && status < 300,
			status,
			json: () => Promise.resolve(data),
			text: () => Promise.resolve(JSON.stringify(data)),
			headers: new Headers(),
		} as Response);
	},

	// Mock API call
	mockApiCall: (endpoint: string, response: any, status = 200) => {
		const mockFetch = global.fetch as any;
		mockFetch.mockImplementation((url: string) => {
			if (url.includes(endpoint)) {
				return testHelpers.createMockResponse(response, status);
			}
			return Promise.reject(new Error(`Unexpected API call to ${url}`));
		});
	},

	// Generate random date in future
	generateFutureDate: (daysFromNow = 30) => {
		const date = new Date();
		date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow));
		return date.toISOString().split("T")[0];
	},

	// Simulate async delay
	simulateAsyncDelay: (ms = 100) =>
		new Promise((resolve) => setTimeout(resolve, ms)),

	// Create test user context
	createTestUserContext: () => ({
		userId: "test-user-123",
		email: "test@example.com",
		preferences: {
			currency: "USD",
			locale: "en-US",
			theme: "system" as const,
		},
		isAuthenticated: true,
	}),
};

// ACCESSIBILITY TEST UTILITIES
export const accessibilityTestUtils = {
	// Mock screen reader
	mockScreenReader: () => {
		const announcements: string[] = [];
		return {
			announce: (text: string) => announcements.push(text),
			getAnnouncements: () => [...announcements],
			clear: () => (announcements.length = 0),
		};
	},

	// Test keyboard navigation
	simulateKeyboardEvent: (key: string, element?: Element) => {
		const event = new KeyboardEvent("keydown", { key });
		(element || document).dispatchEvent(event);
		return event;
	},

	// Check ARIA attributes
	checkAriaAttributes: (element: Element) => {
		const ariaAttributes: Record<string, string> = {};
		for (const attr of element.attributes) {
			if (attr.name.startsWith("aria-") || attr.name === "role") {
				ariaAttributes[attr.name] = attr.value;
			}
		}
		return ariaAttributes;
	},
};

// PERFORMANCE TEST UTILITIES
export const performanceTestUtils = {
	// Measure execution time
	measureTime: async (fn: () => Promise<any> | any) => {
		const start = performance.now();
		await fn();
		return performance.now() - start;
	},

	// Create large dataset for performance testing
	createLargeDataset: (size: number) => {
		return Array.from({ length: size }, (_, i) => ({
			id: i,
			data: `item-${i}`,
			timestamp: Date.now() + i,
		}));
	},

	// Memory usage snapshot (mock)
	getMemoryUsage: () => ({
		used: Math.floor(Math.random() * 100),
		total: 1000,
		percentage: Math.floor(Math.random() * 100),
	}),
};

export default MockDataGenerator;
