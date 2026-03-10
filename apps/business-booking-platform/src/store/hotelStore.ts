import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HotelStore } from './types';

export const useHotelStore = create<HotelStore>()(
	devtools(
		(set, get) => ({
			// Initial state
			selectedHotel: null,
			hotelDetails: {},
			availability: {},
			cache: {
				hotels: {},
				lastUpdated: {},
			},
			loading: {},
			errors: {},

			// Actions
			setSelectedHotel: (hotel) => set({ selectedHotel: hotel }),

			setHotelDetails: (hotelId, details) =>
				set((state) => ({
					hotelDetails: {
						...state.hotelDetails,
						[hotelId]: details,
					},
				})),

			setAvailability: (hotelId, availability) =>
				set((state) => ({
					availability: {
						...state.availability,
						[hotelId]: availability,
					},
				})),

			setCachedHotel: (hotel) =>
				set((state) => ({
					cache: {
						...state.cache,
						hotels: {
							...state.cache.hotels,
							[hotel.id]: hotel,
						},
						lastUpdated: {
							...state.cache.lastUpdated,
							[hotel.id]: new Date().toISOString(),
						},
					},
				})),

			setLoading: (hotelId, loading) =>
				set((state) => ({
					loading: {
						...state.loading,
						[hotelId]: loading,
					},
				})),

			setError: (hotelId, error) =>
				set((state) => ({
					errors: {
						...state.errors,
						[hotelId]: error || '',
					},
				})),

			clearCache: () =>
				set({
					cache: {
						hotels: {},
						lastUpdated: {},
					},
				}),

			getCachedHotel: (hotelId) => {
				const state = get();
				return state.cache.hotels[hotelId] || null;
			},

			isHotelCached: (hotelId, maxAge = 5 * 60 * 1000) => {
				const state = get();
				const lastUpdated = state.cache.lastUpdated[hotelId];
				if (!lastUpdated) {
					return false;
				}

				const age = Date.now() - new Date(lastUpdated).getTime();
				return age < maxAge;
			},
		}),
		{ name: 'HotelStore' },
	),
);
