import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchStore } from "@/store/searchStore";
import { testUtils } from "../setup";

// Mock the store
vi.mock("zustand/middleware", () => ({
	devtools: vi.fn((fn) => fn),
	persist: vi.fn((fn) => fn),
}));

describe("SearchStore", () => {
	beforeEach(() => {
		// Reset store state before each test
		useSearchStore.setState({
			query: "",
			naturalLanguageQuery: "",
			filters: {
				priceRange: [0, 1000],
				starRating: [],
				amenities: [],
				location: {},
				accessibility: {
					wheelchairAccessible: false,
					hearingAccessible: false,
					visualAccessible: false,
				},
				sustainability: false,
				passions: [],
			},
			results: [],
			loading: false,
			error: null,
			pagination: null,
			aiProcessedQuery: null,
			selectedDateRange: {
				checkIn: "",
				checkOut: "",
			},
			guestCount: {
				adults: 2,
				children: 0,
				rooms: 1,
			},
		});
	});

	describe("Initial State", () => {
		it("should initialize with correct default values", () => {
			const state = useSearchStore.getState();

			expect(state.query).toBe("");
			expect(state.naturalLanguageQuery).toBe("");
			expect(state.results).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
			expect(state.pagination).toBe(null);
			expect(state.aiProcessedQuery).toBe(null);
			expect(state.selectedDateRange).toEqual({
				checkIn: "",
				checkOut: "",
			});
			expect(state.guestCount).toEqual({
				adults: 2,
				children: 0,
				rooms: 1,
			});
		});

		it("should initialize filters with correct default values", () => {
			const state = useSearchStore.getState();

			expect(state.filters.priceRange).toEqual([0, 1000]);
			expect(state.filters.starRating).toEqual([]);
			expect(state.filters.amenities).toEqual([]);
			expect(state.filters.location).toEqual({});
			expect(state.filters.accessibility).toEqual({
				wheelchairAccessible: false,
				hearingAccessible: false,
				visualAccessible: false,
			});
			expect(state.filters.sustainability).toBe(false);
			expect(state.filters.passions).toEqual([]);
		});
	});

	describe("Query Actions", () => {
		it("should set query correctly", () => {
			const { setQuery } = useSearchStore.getState();

			setQuery("Paris hotels");

			const state = useSearchStore.getState();
			expect(state.query).toBe("Paris hotels");
		});

		it("should set natural language query correctly", () => {
			const { setNaturalLanguageQuery } = useSearchStore.getState();

			setNaturalLanguageQuery(
				"Find me a luxury hotel in Paris for next weekend",
			);

			const state = useSearchStore.getState();
			expect(state.naturalLanguageQuery).toBe(
				"Find me a luxury hotel in Paris for next weekend",
			);
		});

		it("should clear search and reset relevant state", () => {
			const {
				setQuery,
				setResults,
				setError,
				setPagination,
				setAiProcessedQuery,
				clearSearch,
			} = useSearchStore.getState();

			// Set some values first
			setQuery("test query");
			setResults(testUtils.mockSearchResults);
			setError("test error");
			setPagination({
				page: 1,
				limit: 10,
				total: 100,
				totalPages: 10,
				hasNext: true,
				hasPrev: false,
			});
			setAiProcessedQuery({
				intent: "search_hotels",
				extractedDetails: {
					location: "Paris",
					dates: { checkIn: "2024-12-01", checkOut: "2024-12-03" },
				},
				confidence: 0.9,
			});

			// Clear search
			clearSearch();

			const state = useSearchStore.getState();
			expect(state.query).toBe("");
			expect(state.naturalLanguageQuery).toBe("");
			expect(state.results).toEqual([]);
			expect(state.error).toBe(null);
			expect(state.pagination).toBe(null);
			expect(state.aiProcessedQuery).toBe(null);
		});
	});

	describe("Filter Actions", () => {
		it("should update filters partially", () => {
			const { setFilters } = useSearchStore.getState();

			setFilters({
				priceRange: [100, 500],
				starRating: [4, 5],
			});

			const state = useSearchStore.getState();
			expect(state.filters.priceRange).toEqual([100, 500]);
			expect(state.filters.starRating).toEqual([4, 5]);
			// Other filters should remain unchanged
			expect(state.filters.amenities).toEqual([]);
			expect(state.filters.sustainability).toBe(false);
		});

		it("should update accessibility filters", () => {
			const { setFilters } = useSearchStore.getState();

			setFilters({
				accessibility: {
					wheelchairAccessible: true,
					hearingAccessible: false,
					visualAccessible: true,
				},
			});

			const state = useSearchStore.getState();
			expect(state.filters.accessibility).toEqual({
				wheelchairAccessible: true,
				hearingAccessible: false,
				visualAccessible: true,
			});
		});
	});

	describe("Results Actions", () => {
		it("should set results correctly", () => {
			const { setResults } = useSearchStore.getState();

			setResults(testUtils.mockSearchResults);

			const state = useSearchStore.getState();
			expect(state.results).toEqual(testUtils.mockSearchResults);
		});

		it("should add to existing results", () => {
			const { setResults, addToResults } = useSearchStore.getState();

			// Set initial results
			setResults([testUtils.mockSearchResults[0]]);

			// Add more results
			addToResults([testUtils.mockSearchResults[1]]);

			const state = useSearchStore.getState();
			expect(state.results).toHaveLength(2);
			expect(state.results).toEqual(testUtils.mockSearchResults);
		});

		it("should handle empty results when adding", () => {
			const { addToResults } = useSearchStore.getState();

			addToResults(testUtils.mockSearchResults);

			const state = useSearchStore.getState();
			expect(state.results).toEqual(testUtils.mockSearchResults);
		});
	});

	describe("Loading and Error States", () => {
		it("should set loading state correctly", () => {
			const { setLoading } = useSearchStore.getState();

			setLoading(true);

			let state = useSearchStore.getState();
			expect(state.loading).toBe(true);

			setLoading(false);

			state = useSearchStore.getState();
			expect(state.loading).toBe(false);
		});

		it("should set error state correctly", () => {
			const { setError } = useSearchStore.getState();

			setError("Search failed");

			let state = useSearchStore.getState();
			expect(state.error).toBe("Search failed");

			setError(null);

			state = useSearchStore.getState();
			expect(state.error).toBe(null);
		});
	});

	describe("Date and Guest Management", () => {
		it("should set date range correctly", () => {
			const { setDateRange } = useSearchStore.getState();

			setDateRange("2024-12-01", "2024-12-03");

			const state = useSearchStore.getState();
			expect(state.selectedDateRange).toEqual({
				checkIn: "2024-12-01",
				checkOut: "2024-12-03",
			});
		});

		it("should set guest count correctly", () => {
			const { setGuestCount } = useSearchStore.getState();

			setGuestCount(4, 2, 2);

			const state = useSearchStore.getState();
			expect(state.guestCount).toEqual({
				adults: 4,
				children: 2,
				rooms: 2,
			});
		});
	});

	describe("Pagination and AI Processing", () => {
		it("should set pagination correctly", () => {
			const { setPagination } = useSearchStore.getState();

			const paginationData = {
				page: 2,
				limit: 20,
				total: 150,
				totalPages: 8,
				hasNext: true,
				hasPrev: true,
			};
			setPagination(paginationData);

			const state = useSearchStore.getState();
			expect(state.pagination).toEqual(paginationData);
		});

		it("should set AI processed query correctly", () => {
			const { setAiProcessedQuery } = useSearchStore.getState();

			const aiQuery = {
				intent: "search_hotels",
				extractedDetails: {
					location: "Paris",
					dates: { checkIn: "2024-12-01", checkOut: "2024-12-03" },
					guests: { adults: 2, children: 0, rooms: 1 },
					preferences: ["luxury", "spa"],
				},
				confidence: 0.9,
			};

			setAiProcessedQuery(aiQuery);

			const state = useSearchStore.getState();
			expect(state.aiProcessedQuery).toEqual(aiQuery);
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle full search workflow", () => {
			const store = useSearchStore.getState();

			// Start search
			store.setNaturalLanguageQuery(
				"Luxury hotel in Paris for 2 adults, December 1-3",
			);
			store.setLoading(true);
			store.setDateRange("2024-12-01", "2024-12-03");
			store.setGuestCount(2, 0, 1);

			// AI processing
			store.setAiProcessedQuery({
				intent: "search_hotels",
				extractedDetails: {
					location: "Paris",
					dates: { checkIn: "2024-12-01", checkOut: "2024-12-03" },
					guests: { adults: 2, children: 0, rooms: 1 },
					preferences: ["luxury"],
				},
				confidence: 0.95,
			});

			// Apply filters
			store.setFilters({
				priceRange: [200, 800],
				starRating: [4, 5],
				amenities: ["spa", "restaurant"],
			});

			// Complete search
			store.setResults(testUtils.mockSearchResults);
			store.setPagination({
				page: 1,
				limit: 10,
				total: 25,
				totalPages: 3,
				hasNext: true,
				hasPrev: false,
			});
			store.setLoading(false);

			const state = useSearchStore.getState();
			expect(state.naturalLanguageQuery).toBe(
				"Luxury hotel in Paris for 2 adults, December 1-3",
			);
			expect(state.loading).toBe(false);
			expect(state.results).toEqual(testUtils.mockSearchResults);
			expect(state.pagination?.total).toBe(25);
			expect(state.filters.priceRange).toEqual([200, 800]);
			expect(state.aiProcessedQuery?.extractedDetails.location).toBe("Paris");
		});

		it("should handle search error scenario", () => {
			const store = useSearchStore.getState();

			// Start search
			store.setQuery("Hotels in Invalid City");
			store.setLoading(true);

			// Search fails
			store.setError("No hotels found in the specified location");
			store.setLoading(false);

			const state = useSearchStore.getState();
			expect(state.query).toBe("Hotels in Invalid City");
			expect(state.loading).toBe(false);
			expect(state.error).toBe("No hotels found in the specified location");
			expect(state.results).toEqual([]);
		});

		it("should handle pagination loading scenario", () => {
			const store = useSearchStore.getState();

			// Initial search
			store.setResults([testUtils.mockSearchResults[0]]);
			store.setPagination({
				page: 1,
				limit: 1,
				total: 2,
				totalPages: 2,
				hasNext: true,
				hasPrev: false,
			});

			// Load next page
			store.setLoading(true);
			store.addToResults([testUtils.mockSearchResults[1]]);
			store.setPagination({
				page: 2,
				limit: 1,
				total: 2,
				totalPages: 2,
				hasNext: false,
				hasPrev: true,
			});
			store.setLoading(false);

			const state = useSearchStore.getState();
			expect(state.results).toHaveLength(2);
			expect(state.pagination?.page).toBe(2);
			expect(state.loading).toBe(false);
		});
	});
});
