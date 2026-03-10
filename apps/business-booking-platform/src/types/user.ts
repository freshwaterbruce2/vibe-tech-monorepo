export interface UserState {
	preferences: UserPreferences;
	passions: PassionProfile;
	searchHistory: SearchHistoryItem[];
	bookingHistory: BookingHistoryItem[];
	savedHotels: string[];
	recentlyViewed: string[];
}

export interface UserPreferences {
	currency: string;
	locale: string;
	theme: 'light' | 'dark' | 'system';
	notifications: NotificationPreferences;
	accessibility: AccessibilityPreferences;
	privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
	email: boolean;
	push: boolean;
	sms: boolean;
	priceAlerts: boolean;
	bookingUpdates: boolean;
	promotions: boolean;
}

export interface AccessibilityPreferences {
	screenReader: boolean;
	highContrast: boolean;
	largeText: boolean;
	reduceMotion: boolean;
	keyboardNavigation: boolean;
}

export interface PrivacyPreferences {
	analytics: boolean;
	cookies: boolean;
	personalizedAds: boolean;
	dataSharing: boolean;
}

export interface PassionProfile {
	selectedPassions: PassionType[];
	weights: Record<PassionType, number>;
	lastUpdated: string;
}

export type PassionType =
	| 'romantic-escape'
	| 'adventure-seeker'
	| 'cultural-explorer'
	| 'wellness-retreat'
	| 'business-traveler'
	| 'family-fun'
	| 'luxury-indulgence'
	| 'budget-conscious'
	| 'eco-conscious'
	| 'foodie-experience';

export interface PassionData {
	id: PassionType;
	name: string;
	description: string;
	icon: string;
	keywords: string[];
	amenityWeights: Record<string, number>;
	locationTypes: string[];
	priceRange?: {
		min: number;
		max: number;
	};
}

export interface SearchHistoryItem {
	id: string;
	query: string;
	filters: SearchFilters;
	timestamp: string;
	resultsCount: number;
}

export interface BookingHistoryItem {
	bookingId: string;
	hotelName: string;
	location: string;
	checkIn: string;
	checkOut: string;
	status: 'completed' | 'cancelled' | 'upcoming' | 'in-progress';
	totalAmount: number;
	currency: string;
	timestamp: string;
}

export interface PassionMatcher {
	calculateScore(hotel: Hotel, passions: PassionType[]): number;
	getRecommendations(hotels: Hotel[], profile: PassionProfile): Hotel[];
	updateWeights(
		profile: PassionProfile,
		feedback: UserFeedback,
	): PassionProfile;
}

export interface UserFeedback {
	hotelId: string;
	liked: boolean;
	passionRelevance: Record<PassionType, number>;
	comment?: string;
}

import type { Hotel, SearchFilters } from './hotel';
