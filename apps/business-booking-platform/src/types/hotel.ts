export interface Hotel {
	id: string;
	name: string;
	location: Location;
	rating: number;
	reviewCount: number;
	priceRange: PriceRange;
	amenities: Amenity[];
	images: HotelImage[];
	description: string;
	passionScore?: Record<string, number>;
	availability: AvailabilityStatus;
	virtualTourUrl?: string;
	sustainabilityScore?: number;
	topReview?: Review;
	deals?: { discountPercent: number; description: string }[];
}

export interface Location {
	address: string;
	city: string;
	country: string;
	coordinates: {
		lat: number;
		lng: number;
	};
	neighborhood?: string;
}

export interface PriceRange {
	min: number;
	max: number;
	currency: string;
	avgNightly: number;
	originalPrice?: number;
}

export interface Amenity {
	id: string;
	name: string;
	category: string;
	icon?: string;
	description?: string;
}

export interface HotelImage {
	id: string;
	url: string;
	alt: string;
	category: 'exterior' | 'interior' | 'room' | 'amenity' | 'dining';
	isPrimary: boolean;
}

export interface Room {
	id: string;
	name: string;
	type: string;
	capacity: number;
	price: number;
	currency: string;
	amenities: string[];
	images: string[];
	availability: boolean;
	description: string;
}

export interface AvailabilityStatus {
	available: boolean;
	lastChecked: string;
	priceChange?: number;
	lowAvailability?: boolean;
}

export interface SearchFilters {
	priceRange: [number, number];
	starRating: number[];
	amenities: string[];
	location: LocationFilter;
	accessibility: AccessibilityOptions;
	sustainability: boolean;
	passions: string[];
}

export interface LocationFilter {
	center?: {
		lat: number;
		lng: number;
	};
	radius?: number;
	bounds?: {
		north: number;
		south: number;
		east: number;
		west: number;
	};
}

export interface AccessibilityOptions {
	wheelchairAccessible: boolean;
	hearingAccessible: boolean;
	visualAccessible: boolean;
}

export interface HotelDetails extends Hotel {
	fullDescription: string;
	checkInTime: string;
	checkOutTime: string;
	policies: HotelPolicy[];
	nearbyAttractions: NearbyAttraction[];
	rooms: Room[];
	reviews: Review[];
}

export interface HotelPolicy {
	type: 'cancellation' | 'pet' | 'smoking' | 'children' | 'payment';
	title: string;
	description: string;
}

export interface NearbyAttraction {
	name: string;
	distance: number;
	type: string;
	rating?: number;
}

export interface Review {
	id: string;
	author: string;
	rating: number;
	comment: string;
	date: string;
	helpful: number;
	quote?: string;
}
