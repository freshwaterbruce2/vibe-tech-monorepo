import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { PassionType } from '@/types/user';
import type { UserStore } from './types';

export const useUserStore = create<UserStore>()(
	devtools(
		persist(
			(set) => ({
				// Initial state
				preferences: {
					currency: 'USD',
					locale: 'en-US',
					theme: 'system',
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
				},
				passions: {
					selectedPassions: [],
					weights: {
						'romantic-escape': 0,
						'adventure-seeker': 0,
						'cultural-explorer': 0,
						'wellness-retreat': 0,
						'luxury-indulgence': 0,
						'budget-conscious': 0,
						'family-fun': 0,
						'business-traveler': 0,
						'eco-conscious': 0,
						'foodie-experience': 0,
					} as Record<PassionType, number>,
					lastUpdated: new Date().toISOString(),
				},
				searchHistory: [],
				bookingHistory: [],
				savedHotels: [],
				recentlyViewed: [],

				// Actions
				setPreferences: (newPreferences) =>
					set((state) => ({
						preferences: { ...state.preferences, ...newPreferences },
					})),

				setPassions: (newPassions) =>
					set((state) => ({
						passions: { ...state.passions, ...newPassions },
					})),

				addToSearchHistory: (item) =>
					set((state) => ({
						searchHistory: [item, ...state.searchHistory.slice(0, 49)], // Keep last 50
					})),

				addToBookingHistory: (item) =>
					set((state) => ({
						bookingHistory: [item, ...state.bookingHistory],
					})),

				toggleSavedHotel: (hotelId) =>
					set((state) => ({
						savedHotels: state.savedHotels.includes(hotelId)
							? state.savedHotels.filter((id) => id !== hotelId)
							: [...state.savedHotels, hotelId],
					})),

				addToRecentlyViewed: (hotelId) =>
					set((state) => ({
						recentlyViewed: [
							hotelId,
							...state.recentlyViewed
								.filter((id) => id !== hotelId)
								.slice(0, 19), // Keep last 20
						],
					})),

				clearSearchHistory: () => set({ searchHistory: [] }),

				clearBookingHistory: () => set({ bookingHistory: [] }),

				updatePassionWeights: (weights) =>
					set((state) => ({
						passions: {
							...state.passions,
							weights: { ...state.passions.weights, ...weights },
							lastUpdated: new Date().toISOString(),
						},
					})),

				loadFromStorage: () => {
					// This is handled by the persist middleware
				},

				saveToStorage: () => {
					// This is handled by the persist middleware
				},
			}),
			{
				name: 'user-store',
				// Only persist certain parts of the state
				partialize: (state) => ({
					preferences: state.preferences,
					passions: state.passions,
					savedHotels: state.savedHotels,
				}),
			},
		),
		{ name: 'UserStore' },
	),
);
