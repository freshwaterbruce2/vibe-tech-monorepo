import type { PaginationResponse, ProcessedQuery } from '@/types/api';
import type { BookingState } from '@/types/booking';
import type { Hotel, HotelDetails, SearchFilters } from '@/types/hotel';
import type { UserState } from '@/types/user';

export interface SearchStore {
	// State
	query: string;
	naturalLanguageQuery: string;
	filters: SearchFilters;
	results: Hotel[];
	loading: boolean;
	error: string | null;
	pagination: PaginationResponse | null;
	aiProcessedQuery: ProcessedQuery | null;
	selectedDateRange: {
		checkIn: string;
		checkOut: string;
	};
	guestCount: {
		adults: number;
		children: number;
		rooms: number;
	};

	// Actions
	setQuery: (query: string) => void;
	setNaturalLanguageQuery: (query: string) => void;
	setFilters: (filters: Partial<SearchFilters>) => void;
	setResults: (results: Hotel[]) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setPagination: (pagination: PaginationResponse) => void;
	setAiProcessedQuery: (query: ProcessedQuery) => void;
	setDateRange: (checkIn: string, checkOut: string) => void;
	setGuestCount: (adults: number, children: number, rooms: number) => void;
	clearSearch: () => void;
	addToResults: (hotels: Hotel[]) => void;
}

export interface BookingStore extends BookingState {
	// Actions
	setCurrentStep: (step: BookingState['currentStep']) => void;
	setGuestDetails: (details: Partial<BookingState['guestDetails']>) => void;
	setSelectedRoom: (room: BookingState['selectedRoom']) => void;
	setPaymentInfo: (info: Partial<BookingState['paymentInfo']>) => void;
	setConfirmation: (confirmation: BookingState['confirmation']) => void;
	setErrors: (errors: Record<string, string>) => void;
	setLoading: (loading: boolean) => void;
	clearBooking: () => void;
	nextStep: () => void;
	previousStep: () => void;
	validateCurrentStep: () => boolean;
}

export interface UserStore extends UserState {
	// Actions
	setPreferences: (preferences: Partial<UserState['preferences']>) => void;
	setPassions: (passions: Partial<UserState['passions']>) => void;
	addToSearchHistory: (item: UserState['searchHistory'][0]) => void;
	addToBookingHistory: (item: UserState['bookingHistory'][0]) => void;
	toggleSavedHotel: (hotelId: string) => void;
	addToRecentlyViewed: (hotelId: string) => void;
	clearSearchHistory: () => void;
	clearBookingHistory: () => void;
	updatePassionWeights: (weights: Record<string, number>) => void;
	loadFromStorage: () => void;
	saveToStorage: () => void;
}

export interface HotelStore {
	// State
	selectedHotel: Hotel | null;
	hotelDetails: Record<string, HotelDetails>;
	availability: Record<string, any>;
	cache: {
		hotels: Record<string, Hotel>;
		lastUpdated: Record<string, string>;
	};
	loading: Record<string, boolean>;
	errors: Record<string, string>;

	// Actions
	setSelectedHotel: (hotel: Hotel | null) => void;
	setHotelDetails: (hotelId: string, details: HotelDetails) => void;
	setAvailability: (hotelId: string, availability: any) => void;
	setCachedHotel: (hotel: Hotel) => void;
	setLoading: (hotelId: string, loading: boolean) => void;
	setError: (hotelId: string, error: string | null) => void;
	clearCache: () => void;
	getCachedHotel: (hotelId: string) => Hotel | null;
	isHotelCached: (hotelId: string, maxAge?: number) => boolean;
}
