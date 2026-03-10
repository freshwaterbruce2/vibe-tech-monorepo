import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserStore } from "@/store/userStore";

// Mock the store middleware
vi.mock("zustand/middleware", () => ({
	devtools: vi.fn((fn) => fn),
	persist: vi.fn((fn) => fn),
}));

describe("UserStore", () => {
	const initialPreferences = {
		currency: "USD",
		locale: "en-US",
		theme: "system" as const,
		notifications: {
			email: true,
			push: true,
			sms: false,
			priceAlerts: true,
			bookingUpdates: true,
			promotions: false,
		},
		accessibility: {
			screenReader: false,
			highContrast: false,
			largeText: false,
			reduceMotion: false,
			keyboardNavigation: false,
		},
		privacy: {
			analytics: true,
			cookies: true,
			personalizedAds: false,
			dataSharing: false,
		},
	};

	beforeEach(() => {
		// Reset store state before each test
		useUserStore.setState({
			preferences: initialPreferences,
			passions: {
				selectedPassions: [],
				weights: {
					"romantic-escape": 0,
					"adventure-seeker": 0,
					"cultural-explorer": 0,
					"wellness-retreat": 0,
					"luxury-indulgence": 0,
					"budget-conscious": 0,
					"family-fun": 0,
					"business-traveler": 0,
					"eco-conscious": 0,
					"foodie-experience": 0,
				},
				lastUpdated: new Date().toISOString(),
			},
			searchHistory: [],
			bookingHistory: [],
			savedHotels: [],
			recentlyViewed: [],
		});
	});

	describe("Initial State", () => {
		it("should initialize with correct default preferences", () => {
			const state = useUserStore.getState();

			expect(state.preferences).toEqual(initialPreferences);
			expect(state.preferences.currency).toBe("USD");
			expect(state.preferences.locale).toBe("en-US");
			expect(state.preferences.theme).toBe("system");
		});

		it("should initialize notification preferences correctly", () => {
			const state = useUserStore.getState();

			expect(state.preferences.notifications.email).toBe(true);
			expect(state.preferences.notifications.push).toBe(true);
			expect(state.preferences.notifications.sms).toBe(false);
			expect(state.preferences.notifications.priceAlerts).toBe(true);
			expect(state.preferences.notifications.bookingUpdates).toBe(true);
			expect(state.preferences.notifications.promotions).toBe(false);
		});

		it("should initialize accessibility preferences correctly", () => {
			const state = useUserStore.getState();

			expect(state.preferences.accessibility.screenReader).toBe(false);
			expect(state.preferences.accessibility.highContrast).toBe(false);
			expect(state.preferences.accessibility.largeText).toBe(false);
			expect(state.preferences.accessibility.reduceMotion).toBe(false);
			expect(state.preferences.accessibility.keyboardNavigation).toBe(false);
		});

		it("should initialize privacy preferences correctly", () => {
			const state = useUserStore.getState();

			expect(state.preferences.privacy.analytics).toBe(true);
			expect(state.preferences.privacy.cookies).toBe(true);
			expect(state.preferences.privacy.personalizedAds).toBe(false);
			expect(state.preferences.privacy.dataSharing).toBe(false);
		});

		it("should initialize passion data correctly", () => {
			const state = useUserStore.getState();

			expect(state.passions.selectedPassions).toEqual([]);
			expect(state.passions.weights["romantic-escape"]).toBe(0);
			expect(state.passions.weights["adventure-seeker"]).toBe(0);
			expect(state.passions.weights["cultural-explorer"]).toBe(0);
			expect(typeof state.passions.lastUpdated).toBe("string");
		});

		it("should initialize history arrays as empty", () => {
			const state = useUserStore.getState();

			expect(state.searchHistory).toEqual([]);
			expect(state.bookingHistory).toEqual([]);
			expect(state.savedHotels).toEqual([]);
			expect(state.recentlyViewed).toEqual([]);
		});
	});

	describe("Preferences Management", () => {
		it("should update preferences partially", () => {
			const { setPreferences } = useUserStore.getState();

			setPreferences({
				currency: "EUR",
				theme: "dark",
			});

			const state = useUserStore.getState();
			expect(state.preferences.currency).toBe("EUR");
			expect(state.preferences.theme).toBe("dark");
			// Other preferences should remain unchanged
			expect(state.preferences.locale).toBe("en-US");
		});

		it("should update notification preferences", () => {
			const { setPreferences } = useUserStore.getState();

			setPreferences({
				notifications: {
					email: false,
					push: false,
					sms: true,
					priceAlerts: false,
					bookingUpdates: true,
					promotions: true,
				},
			});

			const state = useUserStore.getState();
			expect(state.preferences.notifications.email).toBe(false);
			expect(state.preferences.notifications.sms).toBe(true);
			expect(state.preferences.notifications.promotions).toBe(true);
		});

		it("should update accessibility preferences", () => {
			const { setPreferences } = useUserStore.getState();

			setPreferences({
				accessibility: {
					screenReader: true,
					highContrast: true,
					largeText: true,
					reduceMotion: true,
					keyboardNavigation: true,
				},
			});

			const state = useUserStore.getState();
			expect(state.preferences.accessibility.screenReader).toBe(true);
			expect(state.preferences.accessibility.highContrast).toBe(true);
			expect(state.preferences.accessibility.largeText).toBe(true);
			expect(state.preferences.accessibility.reduceMotion).toBe(true);
			expect(state.preferences.accessibility.keyboardNavigation).toBe(true);
		});

		it("should update privacy preferences", () => {
			const { setPreferences } = useUserStore.getState();

			setPreferences({
				privacy: {
					analytics: false,
					cookies: false,
					personalizedAds: true,
					dataSharing: true,
				},
			});

			const state = useUserStore.getState();
			expect(state.preferences.privacy.analytics).toBe(false);
			expect(state.preferences.privacy.cookies).toBe(false);
			expect(state.preferences.privacy.personalizedAds).toBe(true);
			expect(state.preferences.privacy.dataSharing).toBe(true);
		});
	});

	describe("Passion Management", () => {
		it("should set passion data", () => {
			const { setPassions } = useUserStore.getState();

			setPassions({
				selectedPassions: ["romantic-escape", "luxury-indulgence"],
			});

			const state = useUserStore.getState();
			expect(state.passions.selectedPassions).toEqual([
				"romantic-escape",
				"luxury-indulgence",
			]);
		});

		it("should update passion weights", () => {
			const { updatePassionWeights } = useUserStore.getState();

			const weights = {
				"romantic-escape": 0.8,
				"luxury-indulgence": 0.6,
				"wellness-retreat": 0.4,
			};

			updatePassionWeights(weights);

			const state = useUserStore.getState();
			expect(state.passions.weights["romantic-escape"]).toBe(0.8);
			expect(state.passions.weights["luxury-indulgence"]).toBe(0.6);
			expect(state.passions.weights["wellness-retreat"]).toBe(0.4);
			// Unchanged weights should remain 0
			expect(state.passions.weights["adventure-seeker"]).toBe(0);
		});

		it("should update lastUpdated when updating passion weights", () => {
			const { updatePassionWeights } = useUserStore.getState();

			const initialTimestamp = useUserStore.getState().passions.lastUpdated;

			// Wait a bit to ensure timestamp difference
			setTimeout(() => {
				updatePassionWeights({ "romantic-escape": 0.5 });

				const state = useUserStore.getState();
				expect(state.passions.lastUpdated).not.toBe(initialTimestamp);
			}, 10);
		});
	});

	describe("Search History Management", () => {
		it("should add to search history", () => {
			const { addToSearchHistory } = useUserStore.getState();

			const searchItem = {
				id: "search-1",
				query: "Paris hotels",
				filters: {
					priceRange: [100, 300] as [number, number],
					starRating: [4, 5],
					amenities: [],
					location: { center: { lat: 48.8566, lng: 2.3522 }, radius: 10 },
					accessibility: {
						wheelchairAccessible: false,
						hearingAccessible: false,
						visualAccessible: false,
					},
					sustainability: false,
					passions: [],
				},
				timestamp: new Date().toISOString(),
				resultsCount: 25,
			};

			addToSearchHistory(searchItem);

			const state = useUserStore.getState();
			expect(state.searchHistory).toHaveLength(1);
			expect(state.searchHistory[0]).toEqual(searchItem);
		});

		it("should maintain search history order (most recent first)", () => {
			const { addToSearchHistory } = useUserStore.getState();

			const firstSearch = {
				id: "search-1",
				query: "First search",
				timestamp: "2024-01-01",
				filters: {
					priceRange: [100, 300] as [number, number],
					starRating: [4, 5],
					amenities: [],
					location: { center: { lat: 48.8566, lng: 2.3522 }, radius: 10 },
					accessibility: {
						wheelchairAccessible: false,
						hearingAccessible: false,
						visualAccessible: false,
					},
					sustainability: false,
					passions: [],
				},
				resultsCount: 10,
			};
			const secondSearch = {
				id: "search-2",
				query: "Second search",
				timestamp: "2024-01-02",
				filters: {
					priceRange: [200, 400] as [number, number],
					starRating: [3, 4],
					amenities: [],
					location: { center: { lat: 51.5074, lng: -0.1278 }, radius: 15 },
					accessibility: {
						wheelchairAccessible: false,
						hearingAccessible: false,
						visualAccessible: false,
					},
					sustainability: false,
					passions: [],
				},
				resultsCount: 20,
			};

			addToSearchHistory(firstSearch);
			addToSearchHistory(secondSearch);

			const state = useUserStore.getState();
			expect(state.searchHistory[0]).toEqual(secondSearch);
			expect(state.searchHistory[1]).toEqual(firstSearch);
		});

		it("should limit search history to 50 items", () => {
			const { addToSearchHistory } = useUserStore.getState();

			// Add 55 items
			for (let i = 0; i < 55; i++) {
				addToSearchHistory({
					id: `search-${i}`,
					query: `Search ${i}`,
					timestamp: new Date().toISOString(),
					filters: {
						priceRange: [100, 300] as [number, number],
						starRating: [4, 5],
						amenities: [],
						location: { center: { lat: 48.8566, lng: 2.3522 }, radius: 10 },
						accessibility: {
							wheelchairAccessible: false,
							hearingAccessible: false,
							visualAccessible: false,
						},
						sustainability: false,
						passions: [],
					},
					resultsCount: 10,
				});
			}

			const state = useUserStore.getState();
			expect(state.searchHistory).toHaveLength(50);
			expect(state.searchHistory[0].query).toBe("Search 54"); // Most recent
		});

		it("should clear search history", () => {
			const { addToSearchHistory, clearSearchHistory } =
				useUserStore.getState();

			addToSearchHistory({
				id: "search-1",
				query: "Test search",
				timestamp: new Date().toISOString(),
				filters: {
					priceRange: [100, 300] as [number, number],
					starRating: [4, 5],
					amenities: [],
					location: { center: { lat: 48.8566, lng: 2.3522 }, radius: 10 },
					accessibility: {
						wheelchairAccessible: false,
						hearingAccessible: false,
						visualAccessible: false,
					},
					sustainability: false,
					passions: [],
				},
				resultsCount: 10,
			});
			clearSearchHistory();

			const state = useUserStore.getState();
			expect(state.searchHistory).toEqual([]);
		});
	});

	describe("Booking History Management", () => {
		it("should add to booking history", () => {
			const { addToBookingHistory } = useUserStore.getState();

			const bookingItem = {
				bookingId: "BOOK123",
				hotelName: "Test Hotel",
				location: "Test City",
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
				totalAmount: 500,
				currency: "USD",
				status: "completed" as const,
				timestamp: new Date().toISOString(),
			};

			addToBookingHistory(bookingItem);

			const state = useUserStore.getState();
			expect(state.bookingHistory).toHaveLength(1);
			expect(state.bookingHistory[0]).toEqual(bookingItem);
		});

		it("should maintain booking history order (most recent first)", () => {
			const { addToBookingHistory } = useUserStore.getState();

			const firstBooking = {
				bookingId: "BOOK1",
				hotelName: "First Hotel",
				location: "New York",
				checkIn: "2024-01-01",
				checkOut: "2024-01-03",
				status: "completed" as const,
				totalAmount: 300,
				currency: "USD",
				timestamp: "2024-01-01",
			};
			const secondBooking = {
				bookingId: "BOOK2",
				hotelName: "Second Hotel",
				location: "Paris",
				checkIn: "2024-01-02",
				checkOut: "2024-01-04",
				status: "completed" as const,
				totalAmount: 450,
				currency: "USD",
				timestamp: "2024-01-02",
			};

			addToBookingHistory(firstBooking);
			addToBookingHistory(secondBooking);

			const state = useUserStore.getState();
			expect(state.bookingHistory[0]).toEqual(secondBooking);
			expect(state.bookingHistory[1]).toEqual(firstBooking);
		});

		it("should clear booking history", () => {
			const { addToBookingHistory, clearBookingHistory } =
				useUserStore.getState();

			addToBookingHistory({
				bookingId: "BOOK123",
				hotelName: "Test Hotel",
				location: "Test City",
				checkIn: "2024-01-01",
				checkOut: "2024-01-03",
				status: "completed",
				totalAmount: 300,
				currency: "USD",
				timestamp: new Date().toISOString(),
			});
			clearBookingHistory();

			const state = useUserStore.getState();
			expect(state.bookingHistory).toEqual([]);
		});
	});

	describe("Saved Hotels Management", () => {
		it("should add hotel to saved list", () => {
			const { toggleSavedHotel } = useUserStore.getState();

			toggleSavedHotel("hotel-123");

			const state = useUserStore.getState();
			expect(state.savedHotels).toContain("hotel-123");
		});

		it("should remove hotel from saved list when toggled again", () => {
			const { toggleSavedHotel } = useUserStore.getState();

			toggleSavedHotel("hotel-123");
			toggleSavedHotel("hotel-123");

			const state = useUserStore.getState();
			expect(state.savedHotels).not.toContain("hotel-123");
		});

		it("should handle multiple saved hotels", () => {
			const { toggleSavedHotel } = useUserStore.getState();

			toggleSavedHotel("hotel-123");
			toggleSavedHotel("hotel-456");
			toggleSavedHotel("hotel-789");

			const state = useUserStore.getState();
			expect(state.savedHotels).toEqual([
				"hotel-123",
				"hotel-456",
				"hotel-789",
			]);
		});
	});

	describe("Recently Viewed Management", () => {
		it("should add hotel to recently viewed", () => {
			const { addToRecentlyViewed } = useUserStore.getState();

			addToRecentlyViewed("hotel-123");

			const state = useUserStore.getState();
			expect(state.recentlyViewed).toContain("hotel-123");
			expect(state.recentlyViewed[0]).toBe("hotel-123");
		});

		it("should move hotel to front if already viewed", () => {
			const { addToRecentlyViewed } = useUserStore.getState();

			addToRecentlyViewed("hotel-123");
			addToRecentlyViewed("hotel-456");
			addToRecentlyViewed("hotel-123"); // View again

			const state = useUserStore.getState();
			expect(state.recentlyViewed[0]).toBe("hotel-123");
			expect(state.recentlyViewed[1]).toBe("hotel-456");
			expect(state.recentlyViewed).toHaveLength(2); // No duplicates
		});

		it("should limit recently viewed to 20 items", () => {
			const { addToRecentlyViewed } = useUserStore.getState();

			// Add 25 hotels
			for (let i = 0; i < 25; i++) {
				addToRecentlyViewed(`hotel-${i}`);
			}

			const state = useUserStore.getState();
			expect(state.recentlyViewed).toHaveLength(20);
			expect(state.recentlyViewed[0]).toBe("hotel-24"); // Most recent
		});
	});

	describe("Complex User Scenarios", () => {
		it("should handle user preference updates for accessibility needs", () => {
			const { setPreferences } = useUserStore.getState();

			// User enables accessibility features
			setPreferences({
				accessibility: {
					screenReader: true,
					highContrast: true,
					largeText: true,
					reduceMotion: true,
					keyboardNavigation: true,
				},
				notifications: {
					email: true,
					push: false, // Disable push for better accessibility
					sms: true,
					priceAlerts: true,
					bookingUpdates: true,
					promotions: false,
				},
			});

			const state = useUserStore.getState();
			expect(state.preferences.accessibility.screenReader).toBe(true);
			expect(state.preferences.accessibility.highContrast).toBe(true);
			expect(state.preferences.notifications.push).toBe(false);
			expect(state.preferences.notifications.sms).toBe(true);
		});

		it("should handle privacy-conscious user preferences", () => {
			const { setPreferences } = useUserStore.getState();

			// User opts out of tracking and ads
			setPreferences({
				privacy: {
					analytics: false,
					cookies: false,
					personalizedAds: false,
					dataSharing: false,
				},
				notifications: {
					email: true,
					push: false,
					sms: false,
					priceAlerts: true,
					bookingUpdates: true,
					promotions: false, // No promotional content
				},
			});

			const state = useUserStore.getState();
			expect(state.preferences.privacy.analytics).toBe(false);
			expect(state.preferences.privacy.personalizedAds).toBe(false);
			expect(state.preferences.notifications.promotions).toBe(false);
		});

		it("should handle complete user journey with passions and history", () => {
			const store = useUserStore.getState();

			// 1. User sets up their passions
			store.setPassions({
				selectedPassions: [
					"romantic-escape",
					"luxury-indulgence",
					"wellness-retreat",
				],
			});

			store.updatePassionWeights({
				"romantic-escape": 0.9,
				"luxury-indulgence": 0.7,
				"wellness-retreat": 0.5,
			});

			// 2. User performs searches
			store.addToSearchHistory({
				id: "search-tuscany-1",
				query: "Romantic spa hotels in Tuscany",
				filters: {
					priceRange: [300, 800] as [number, number],
					starRating: [4, 5],
					amenities: ["spa", "restaurant"],
					location: { center: { lat: 43.7711, lng: 11.2486 }, radius: 50 },
					accessibility: {
						wheelchairAccessible: false,
						hearingAccessible: false,
						visualAccessible: false,
					},
					sustainability: false,
					passions: ["romantic-escape", "wellness-retreat"],
				},
				timestamp: "2024-12-01T10:00:00Z",
				resultsCount: 15,
			});

			// 3. User views hotels
			store.addToRecentlyViewed("hotel-tuscany-spa-001");
			store.addToRecentlyViewed("hotel-florence-luxury-002");

			// 4. User saves favorite hotels
			store.toggleSavedHotel("hotel-tuscany-spa-001");

			// 5. User makes a booking
			store.addToBookingHistory({
				bookingId: "BOOK456",
				hotelName: "Tuscany Wellness Spa Resort",
				location: "Tuscany, Italy",
				checkIn: "2024-12-15",
				checkOut: "2024-12-18",
				totalAmount: 1200,
				currency: "USD",
				status: "completed" as const,
				timestamp: "2024-12-01T15:30:00Z",
			});

			const finalState = useUserStore.getState();
			expect(finalState.passions.selectedPassions).toContain("romantic-escape");
			expect(finalState.passions.weights["romantic-escape"]).toBe(0.9);
			expect(finalState.searchHistory).toHaveLength(1);
			expect(finalState.recentlyViewed).toContain("hotel-tuscany-spa-001");
			expect(finalState.savedHotels).toContain("hotel-tuscany-spa-001");
			expect(finalState.bookingHistory).toHaveLength(1);
			expect(finalState.bookingHistory[0].hotelName).toBe(
				"Tuscany Wellness Spa Resort",
			);
		});
	});
});
