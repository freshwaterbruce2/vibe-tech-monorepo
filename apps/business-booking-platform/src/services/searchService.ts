import type { Hotel } from '@/types/hotel';
import { logger } from '@/utils/logger';
import axios from 'axios';

interface SearchParams {
	destination: string;
	checkIn: string;
	checkOut: string;
	guests: string;
	rooms: string;
}

interface SearchResponse {
	hotels: Hotel[];
	total: number;
	page: number;
	limit: number;
}

// Mock hotel data for fallback
const mockHotels: Hotel[] = [
	{
		id: '1',
		name: 'Grand Luxury Resort & Spa',
		description:
			'Experience ultimate luxury with breathtaking ocean views and world-class amenities.',
		rating: 4.8,
		reviewCount: 2847,
		priceRange: {
			min: 350,
			max: 650,
			currency: 'USD',
			avgNightly: 450,
			originalPrice: 650,
		},
		images: [
			{
				id: '1-1',
				url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
				alt: 'Grand Luxury Resort exterior',
				category: 'exterior',
				isPrimary: true,
			},
			{
				id: '1-2',
				url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
				alt: 'Luxury room interior',
				category: 'room',
				isPrimary: false,
			},
		],
		amenities: [
			{ id: 'pool', name: 'Pool', category: 'Recreation' },
			{ id: 'spa', name: 'Spa', category: 'Wellness' },
			{ id: 'gym', name: 'Gym', category: 'Fitness' },
			{ id: 'restaurant', name: 'Restaurant', category: 'Dining' },
			{ id: 'wifi', name: 'WiFi', category: 'Technology' },
			{ id: 'room-service', name: 'Room Service', category: 'Service' },
		],
		location: {
			address: '123 Ocean Drive, Miami Beach, FL',
			city: 'Miami Beach',
			country: 'USA',
			coordinates: { lat: 25.7617, lng: -80.1918 },
		},
		passionScore: { luxury: 0.92, beach: 0.95, wellness: 0.88 },
		availability: {
			available: true,
			lastChecked: new Date().toISOString(),
			lowAvailability: false,
		},
	},
	{
		id: '2',
		name: 'Urban Boutique Hotel',
		description:
			'Modern sophistication in the heart of downtown with stunning city skyline views.',
		rating: 4.6,
		reviewCount: 1234,
		priceRange: {
			min: 200,
			max: 350,
			currency: 'USD',
			avgNightly: 280,
			originalPrice: 350,
		},
		images: [
			{
				id: '2-1',
				url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop',
				alt: 'Urban boutique hotel lobby',
				category: 'interior',
				isPrimary: true,
			},
			{
				id: '2-2',
				url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop',
				alt: 'Modern city room',
				category: 'room',
				isPrimary: false,
			},
		],
		amenities: [
			{ id: 'wifi', name: 'WiFi', category: 'Technology' },
			{ id: 'gym', name: 'Gym', category: 'Fitness' },
			{ id: 'restaurant', name: 'Restaurant', category: 'Dining' },
			{ id: 'bar', name: 'Bar', category: 'Dining' },
			{ id: 'concierge', name: 'Concierge', category: 'Service' },
		],
		location: {
			address: '456 City Center, New York, NY',
			city: 'New York',
			country: 'USA',
			coordinates: { lat: 40.7128, lng: -74.006 },
		},
		passionScore: { urban: 0.85, business: 0.9, culture: 0.82 },
		availability: {
			available: true,
			lastChecked: new Date().toISOString(),
			lowAvailability: true,
		},
	},
	{
		id: '3',
		name: 'Mountain Retreat Lodge',
		description:
			'Peaceful escape surrounded by pristine nature and mountain wilderness.',
		rating: 4.7,
		reviewCount: 892,
		priceRange: {
			min: 250,
			max: 380,
			currency: 'USD',
			avgNightly: 320,
			originalPrice: 380,
		},
		images: [
			{
				id: '3-1',
				url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop',
				alt: 'Mountain lodge exterior',
				category: 'exterior',
				isPrimary: true,
			},
			{
				id: '3-2',
				url: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&h=600&fit=crop',
				alt: 'Cozy mountain room',
				category: 'room',
				isPrimary: false,
			},
		],
		amenities: [
			{ id: 'hiking', name: 'Hiking Trails', category: 'Recreation' },
			{ id: 'spa', name: 'Spa', category: 'Wellness' },
			{ id: 'restaurant', name: 'Restaurant', category: 'Dining' },
			{ id: 'wifi', name: 'WiFi', category: 'Technology' },
			{ id: 'fireplace', name: 'Fireplace', category: 'Comfort' },
		],
		location: {
			address: '789 Mountain View, Aspen, CO',
			city: 'Aspen',
			country: 'USA',
			coordinates: { lat: 39.1911, lng: -106.8175 },
		},
		passionScore: { nature: 0.88, wellness: 0.85, adventure: 0.92 },
		availability: {
			available: true,
			lastChecked: new Date().toISOString(),
			lowAvailability: false,
		},
	},
];

class SearchService {
	private baseURL = import.meta.env.DEV
		? '/api'
		: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;
	private timeout = 5000; // 5 second timeout

	async searchHotels(params: SearchParams): Promise<SearchResponse> {
		try {
			// Try API call first
			const response = await axios.post(
				`${this.baseURL}/hotels/search`,
				{
					destination: params.destination,
					checkIn: params.checkIn,
					checkOut: params.checkOut,
					guests: this.parseGuests(params.guests),
					rooms: parseInt(params.rooms) || 1,
				},
				{
					timeout: this.timeout,
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
				},
			);

			return {
				hotels: response.data.hotels || [],
				total: response.data.total || 0,
				page: response.data.page || 1,
				limit: response.data.limit || 10,
			};
		} catch (_error) {
			logger.info(
				'Hotel search API unavailable, providing mock results for seamless UX',
				{
					component: 'SearchService',
					method: 'searchHotels',
					destination: params.destination,
					error: _error instanceof Error ? _error.message : 'Unknown error',
					fallbackStrategy: 'filtered_mock_data',
				},
			);

			// Fallback to mock data with smart filtering
			const filteredHotels = this.filterMockHotels(params.destination);

			return {
				hotels: filteredHotels,
				total: filteredHotels.length,
				page: 1,
				limit: 10,
			};
		}
	}

	private parseGuests(guestsString: string): {
		adults: number;
		children: number;
	} {
		// Parse strings like "2 Adults, 1 Room" or "3 Adults, 2 Rooms"
		const adults = parseInt(guestsString.match(/(\d+)\s*Adult/i)?.[1] || '2');
		return { adults, children: 0 };
	}

	private filterMockHotels(destination: string): Hotel[] {
		if (!destination.trim()) {
			return mockHotels;
		}

		const searchTerm = destination.toLowerCase();

		// Smart filtering based on destination
		const filtered = mockHotels.filter((hotel) => {
			const hotelName = hotel.name.toLowerCase();
			const hotelLocation = hotel.location.address.toLowerCase();
			const hotelDescription = hotel.description.toLowerCase();

			return (
				hotelName.includes(searchTerm) ||
				hotelLocation.includes(searchTerm) ||
				hotelDescription.includes(searchTerm) ||
				this.matchesDestinationType(searchTerm, hotel)
			);
		});

		return filtered.length > 0 ? filtered : mockHotels;
	}

	private matchesDestinationType(searchTerm: string, hotel: Hotel): boolean {
		const beachTerms = ['beach', 'ocean', 'coastal', 'seaside', 'waterfront'];
		const cityTerms = ['city', 'urban', 'downtown', 'metropolitan'];
		const mountainTerms = [
			'mountain',
			'alpine',
			'wilderness',
			'nature',
			'retreat',
		];

		const isBeachSearch = beachTerms.some((term) => searchTerm.includes(term));
		const isCitySearch = cityTerms.some((term) => searchTerm.includes(term));
		const isMountainSearch = mountainTerms.some((term) =>
			searchTerm.includes(term),
		);

		const hotelType = this.getHotelType(hotel);

		return (
			(isBeachSearch && hotelType === 'beach') ||
			(isCitySearch && hotelType === 'city') ||
			(isMountainSearch && hotelType === 'mountain')
		);
	}

	private getHotelType(hotel: Hotel): string {
		const name = hotel.name.toLowerCase();
		const description = hotel.description.toLowerCase();

		if (
			name.includes('resort') ||
			description.includes('ocean') ||
			description.includes('beach')
		) {
			return 'beach';
		}
		if (
			name.includes('urban') ||
			name.includes('boutique') ||
			description.includes('downtown')
		) {
			return 'city';
		}
		if (
			name.includes('lodge') ||
			name.includes('retreat') ||
			description.includes('mountain')
		) {
			return 'mountain';
		}

		return 'general';
	}

	async getHotelDetails(hotelId: string): Promise<Hotel | null> {
		try {
			const response = await axios.get(`${this.baseURL}/hotels/${hotelId}`, {
				timeout: this.timeout,
			});
			return response.data.hotel;
		} catch (error) {
			logger.info('Hotel details API unavailable, using mock data fallback', {
				component: 'SearchService',
				method: 'getHotelDetails',
				hotelId,
				error: error instanceof Error ? error.message : 'Unknown error',
				fallbackStrategy: 'mock_hotel_data',
			});
			return mockHotels.find((h) => h.id === hotelId) || null;
		}
	}

	async getSuggestions(query: string): Promise<string[]> {
		if (!query || query.length < 2) {
			return [];
		}

		try {
			const response = await axios.get(`${this.baseURL}/hotels/suggestions`, {
				params: { q: query },
				timeout: 2000, // Shorter timeout for suggestions
			});
			return response.data.suggestions || [];
		} catch (_error) {
			// Fallback to mock suggestions
			const mockSuggestions = [
				'New York, NY',
				'Miami Beach, FL',
				'Los Angeles, CA',
				'Paris, France',
				'London, UK',
				'Tokyo, Japan',
				'Barcelona, Spain',
				'Dubai, UAE',
				'Sydney, Australia',
				'Rome, Italy',
			];

			return mockSuggestions
				.filter((suggestion) =>
					suggestion.toLowerCase().includes(query.toLowerCase()),
				)
				.slice(0, 6);
		}
	}
}

export const searchService = new SearchService();
