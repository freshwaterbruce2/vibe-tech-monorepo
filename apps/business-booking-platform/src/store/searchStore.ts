import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SearchFilters } from '@/types/hotel';
import type { SearchStore } from './types';

const initialFilters: SearchFilters = {
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
};

export const useSearchStore = create<SearchStore>()(
	devtools(
		persist(
			(set) => ({
				// Initial state
				query: '',
				naturalLanguageQuery: '',
				filters: initialFilters,
				results: [],
				loading: false,
				error: null,
				pagination: null,
				aiProcessedQuery: null,
				selectedDateRange: {
					checkIn: '',
					checkOut: '',
				},
				guestCount: {
					adults: 2,
					children: 0,
					rooms: 1,
				},

				// Actions
				setQuery: (query: string) => set({ query }),

				setNaturalLanguageQuery: (query: string) =>
					set({ naturalLanguageQuery: query }),

				setFilters: (newFilters: Partial<SearchFilters>) =>
					set((state) => ({
						filters: { ...state.filters, ...newFilters },
					})),

				setResults: (results) => set({ results }),

				setLoading: (loading) => set({ loading }),

				setError: (error) => set({ error }),

				setPagination: (pagination) => set({ pagination }),

				setAiProcessedQuery: (aiProcessedQuery) => set({ aiProcessedQuery }),

				setDateRange: (checkIn: string, checkOut: string) =>
					set({ selectedDateRange: { checkIn, checkOut } }),

				setGuestCount: (adults: number, children: number, rooms: number) =>
					set({ guestCount: { adults, children, rooms } }),

				clearSearch: () =>
					set({
						query: '',
						naturalLanguageQuery: '',
						results: [],
						error: null,
						pagination: null,
						aiProcessedQuery: null,
					}),

				addToResults: (hotels) =>
					set((state) => ({
						results: [...state.results, ...hotels],
					})),
			}),
			{
				name: 'search-store',
				partialize: (state) => ({
					filters: state.filters,
					selectedDateRange: state.selectedDateRange,
					guestCount: state.guestCount,
				}),
			},
		),
		{ name: 'SearchStore' },
	),
);
