export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface SearchRequest {
	naturalLanguageQuery?: string;
	filters: SearchFilters;
	preferences: UserPreferences;
	pagination?: PaginationRequest;
}

export interface SearchResponse {
	processedQuery?: ProcessedQuery;
	hotels: Hotel[];
	totalResults: number;
	pagination: PaginationResponse;
	recommendations?: RecommendationData;
}

export interface ProcessedQuery {
	intent: string;
	originalQuery?: string;
	extractedDetails: {
		location?: string;
		dates?: {
			checkIn: string;
			checkOut: string;
		};
		guests?: {
			adults: number;
			children: number;
			rooms: number;
		};
		preferences?: string[];
		budget?: {
			min: number;
			max: number;
			currency: string;
		};
	};
	confidence: number;
}

export interface PaginationRequest {
	page: number;
	limit: number;
	offset?: number;
}

export interface PaginationResponse {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface UserPreferences {
	currency: string;
	locale: string;
	theme: 'light' | 'dark' | 'system';
	notifications: boolean;
}

export interface RecommendationData {
	personalizedRecommendations: Hotel[];
	trendingDestinations: TrendingDestination[];
	seasonalOffers: SeasonalOffer[];
}

export interface TrendingDestination {
	city: string;
	country: string;
	popularity: number;
	avgPrice: number;
	currency: string;
	imageUrl: string;
}

export interface SeasonalOffer {
	title: string;
	description: string;
	discount: number;
	validUntil: string;
	hotelIds: string[];
}

export interface AvailabilityUpdate {
	hotelId: string;
	available: boolean;
	priceChange?: number;
	lastUpdate: string;
	inventory?: number;
}

export interface BookingRequest {
	hotelId: string;
	roomId: string;
	checkIn: string;
	checkOut: string;
	guestDetails: GuestDetails;
	paymentInfo: PaymentInfo;
	specialRequests?: string;
}

export interface PreBookingResponse {
	prebookingId: string;
	expiresAt: string;
	totalAmount: number;
	currency: string;
	cancellationPolicy: CancellationPolicy;
	termsAndConditions: string;
}

export interface CancellationPolicy {
	type: 'free' | 'partial' | 'non-refundable';
	freeUntil?: string;
	penalty?: number;
	description: string;
}

import type { GuestDetails, PaymentInfo } from './booking';
import type { Hotel, SearchFilters } from './hotel';
