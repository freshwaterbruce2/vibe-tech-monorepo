import axios, { type AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { cacheService } from './cacheService';

export class LiteAPIService {
	private client: AxiosInstance;
	private cachePrefix = 'liteapi:';
	private cacheTTL = 300; // 5 minutes

	private allowMockFallback(): boolean {
		return (
			process.env.NODE_ENV === 'test' ||
			(process.env.NODE_ENV !== 'production' &&
				process.env.LITEAPI_ENABLE_MOCK_FALLBACK === 'true')
		);
	}

	private assertMockFallbackAllowed(message: string): void {
		if (!this.allowMockFallback()) {
			throw new Error(message);
		}
	}

	constructor() {
		this.client = axios.create({
			baseURL: config.liteapi.baseUrl,
			timeout: config.liteapi.timeout,
			headers: {
				'X-API-Key': config.liteapi.apiKey,
				'Content-Type': 'application/json',
			},
		});

		// Request interceptor for logging
		this.client.interceptors.request.use(
			(request) => {
				logger.debug('LiteAPI request', {
					method: request.method,
					url: request.url,
					params: request.params,
				});
				return request;
			},
			(error) => {
				logger.error('LiteAPI request error', { error });
				return Promise.reject(error);
			},
		);

		// Response interceptor for error handling
		this.client.interceptors.response.use(
			(response) => {
				logger.debug('LiteAPI response', {
					status: response.status,
					url: response.config.url,
				});
				return response;
			},
			(error) => {
				logger.error('LiteAPI response error', {
					status: error.response?.status,
					data: error.response?.data,
				});
				return Promise.reject(error);
			},
		);
	}

	async searchHotels(params: {
		destination: string;
		checkIn: string;
		checkOut: string;
		adults: number;
		children?: number;
		rooms?: number;
		priceMin?: number;
		priceMax?: number;
		starRating?: number[];
		amenities?: string[];
		limit?: number;
		offset?: number;
	}): Promise<any[]> {
		try {
			const cacheKey = `${this.cachePrefix}search:${JSON.stringify(params)}`;
			const cached = await cacheService.get(cacheKey);
			if (cached) {
				return cached as any[];
			}

			const response = await this.client.get('/hotels/search', {
				params: {
					destination: params.destination,
					checkin: params.checkIn,
					checkout: params.checkOut,
					adults: params.adults,
					children: params.children || 0,
					rooms: params.rooms || 1,
					price_min: params.priceMin,
					price_max: params.priceMax,
					star_rating: params.starRating?.join(','),
					amenities: params.amenities?.join(','),
					limit: params.limit || 20,
					offset: params.offset || 0,
				},
			});

			const hotels = response.data.data || [];
			await cacheService.set(cacheKey, hotels, this.cacheTTL);

			return hotels;
		} catch (error) {
			logger.error('Failed to search hotels', {
				error,
				params,
			});
			this.assertMockFallbackAllowed(
				'LiteAPI hotel search failed and mock fallback is disabled',
			);

			// Fallback to mock hotel data when API fails
			const mockHotels = [
				{
					id: 'mock-hotel-1',
					name: 'Grand Plaza Hotel',
					address: '123 Main St',
					city: params.destination || 'New York',
					country: 'United States',
					latitude: 40.7128,
					longitude: -74.006,
					starRating: 5,
					description:
						'Luxury hotel in the heart of downtown with world-class amenities',
					images: [
						{
							url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
							caption: 'Hotel Exterior',
						},
						{
							url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
							caption: 'Lobby',
						},
					],
					amenities: [
						'WiFi',
						'Pool',
						'Spa',
						'Restaurant',
						'Gym',
						'Business Center',
					],
					price: { amount: 250, currency: 'USD' },
					passionScore: 0,
				},
				{
					id: 'mock-hotel-2',
					name: 'Comfort Inn & Suites',
					address: '456 Oak Ave',
					city: params.destination || 'New York',
					country: 'United States',
					latitude: 40.7589,
					longitude: -73.9851,
					starRating: 3,
					description:
						'Comfortable and affordable hotel perfect for business travelers',
					images: [
						{
							url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
							caption: 'Room',
						},
						{
							url: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800',
							caption: 'Restaurant',
						},
					],
					amenities: ['WiFi', 'Breakfast', 'Parking', 'Business Center'],
					price: { amount: 120, currency: 'USD' },
					passionScore: 0,
				},
				{
					id: 'mock-hotel-3',
					name: 'Seaside Resort & Spa',
					address: '789 Beach Blvd',
					city: params.destination || 'Miami',
					country: 'United States',
					latitude: 25.7617,
					longitude: -80.1918,
					starRating: 4,
					description:
						'Beachfront resort with stunning ocean views and full spa services',
					images: [
						{
							url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
							caption: 'Beach View',
						},
						{
							url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
							caption: 'Pool',
						},
					],
					amenities: [
						'Beach Access',
						'Pool',
						'Spa',
						'Restaurant',
						'Water Sports',
						'Kids Club',
					],
					price: { amount: 350, currency: 'USD' },
					passionScore: 0,
				},
			];

			// Apply filters to mock data
			let filteredHotels = mockHotels;

			const priceMin = params.priceMin;
			if (priceMin !== undefined) {
				filteredHotels = filteredHotels.filter(
					(h) => h.price.amount >= priceMin,
				);
			}
			const priceMax = params.priceMax;
			if (priceMax !== undefined) {
				filteredHotels = filteredHotels.filter(
					(h) => h.price.amount <= priceMax,
				);
			}
			if (params.starRating && params.starRating.length > 0) {
				filteredHotels = filteredHotels.filter((h) =>
					params.starRating?.includes(h.starRating),
				);
			}

			// Apply pagination
			const start = params.offset || 0;
			const end = start + (params.limit || 20);

			return filteredHotels.slice(start, end);
		}
	}

	async getHotelDetails(hotelId: string): Promise<any> {
		try {
			const cacheKey = `${this.cachePrefix}hotel:${hotelId}`;
			const cached = await cacheService.get(cacheKey);
			if (cached) {
				return cached;
			}

			const response = await this.client.get(`/hotels/${hotelId}`);
			const hotel = response.data.data;

			await cacheService.set(cacheKey, hotel, this.cacheTTL);

			return hotel;
		} catch (error) {
			logger.error('Failed to get hotel details', {
				error,
				hotelId,
			});
			this.assertMockFallbackAllowed(
				'LiteAPI hotel details failed and mock fallback is disabled',
			);

			// Return mock hotel details when API fails
			return {
				id: hotelId,
				name: 'Grand Plaza Hotel',
				address: '123 Main St',
				city: 'New York',
				country: 'United States',
				latitude: 40.7128,
				longitude: -74.006,
				starRating: 5,
				rating: 4.5,
				reviewCount: 1250,
				description:
					'Experience luxury at its finest at the Grand Plaza Hotel. Located in the heart of downtown.',
				fullDescription:
					'Experience luxury at its finest at the Grand Plaza Hotel. Located in the heart of downtown, our hotel offers world-class amenities, exceptional service, and stunning city views. Perfect for business travelers and tourists alike.',
				images: [
					{
						url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
						alt: 'Hotel Exterior',
						caption: 'Hotel Exterior',
						isPrimary: true,
					},
					{
						url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
						alt: 'Lobby',
						caption: 'Elegant Lobby',
					},
					{
						url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
						alt: 'Deluxe Room',
						caption: 'Deluxe King Room',
					},
					{
						url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
						alt: 'Standard Room',
						caption: 'Standard Twin Room',
					},
					{
						url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
						alt: 'Suite',
						caption: 'Executive Suite',
					},
					{
						url: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800',
						alt: 'Restaurant',
						caption: 'Fine Dining Restaurant',
					},
					{
						url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
						alt: 'Pool Area',
						caption: 'Rooftop Pool',
					},
					{
						url: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800',
						alt: 'Room View',
						caption: 'City View from Room',
					},
				],
				amenities: [
					{ id: 'wifi', name: 'Free WiFi', category: 'technology', icon: '📶' },
					{
						id: 'pool',
						name: 'Outdoor Pool',
						category: 'recreation',
						icon: '🏊',
					},
					{
						id: 'spa',
						name: 'Full Service Spa',
						category: 'wellness',
						icon: '💆',
					},
					{
						id: 'restaurant',
						name: 'Fine Dining Restaurant',
						category: 'dining',
						icon: '🍽️',
					},
					{
						id: 'gym',
						name: '24/7 Fitness Center',
						category: 'fitness',
						icon: '🏋️',
					},
					{
						id: 'business',
						name: 'Business Center',
						category: 'business',
						icon: '💼',
					},
				],
				rooms: [
					{
						id: 'room-1',
						name: 'Deluxe King Room',
						type: 'Deluxe',
						description: 'Spacious room with king bed and city views',
						price: 250,
						currency: 'USD',
						capacity: 2,
						images: [
							'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', // Deluxe king bed main view
							'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800', // Deluxe room elegant seating
							'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', // City view from window
						],
						amenities: ['King Bed', 'City View', 'Mini Bar', 'Work Desk'],
						availability: true,
					},
					{
						id: 'room-2',
						name: 'Twin Beds Room',
						type: 'Standard',
						description: 'Comfortable room with two twin beds',
						price: 180,
						currency: 'USD',
						capacity: 2,
						images: [
							'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', // Standard twin room
							'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', // Twin room bathroom
							'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', // Standard room workspace
						],
						amenities: ['Twin Beds', 'Free WiFi', 'Air Conditioning'],
						availability: true,
					},
					{
						id: 'room-3',
						name: 'Executive Suite',
						type: 'Suite',
						description: 'Luxurious suite with separate living area',
						price: 450,
						currency: 'USD',
						capacity: 4,
						images: [
							'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', // Executive suite luxury main
							'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800', // Suite living room
							'https://images.unsplash.com/photo-1560448075-bb485b067938?w=800', // Suite balcony view
						],
						amenities: ['Living Room', 'Kitchen', 'Balcony', 'Jacuzzi'],
						availability: true,
					},
				],
				location: {
					address: '123 Main St',
					city: 'New York',
					state: 'NY',
					country: 'United States',
					postalCode: '10001',
					coordinates: { lat: 40.7128, lng: -74.006 },
				},
				policies: [
					{
						type: 'checkin',
						title: 'Check-in Time',
						description: 'Check-in after 3:00 PM',
					},
					{
						type: 'checkout',
						title: 'Check-out Time',
						description: 'Check-out before 11:00 AM',
					},
					{
						type: 'cancellation',
						title: 'Cancellation Policy',
						description: 'Free cancellation up to 24 hours before check-in',
					},
				],
				checkInTime: '3:00 PM',
				checkOutTime: '11:00 AM',
				priceRange: {
					min: 180,
					max: 450,
					avgNightly: 250,
					currency: 'USD',
				},
				nearbyAttractions: [
					{ name: 'Central Park', type: 'Park', distance: '0.5 miles' },
					{ name: 'Times Square', type: 'Landmark', distance: '0.8 miles' },
					{
						name: 'Museum of Modern Art',
						type: 'Museum',
						distance: '1.2 miles',
					},
				],
				passionScore: {
					luxury: 0.85,
					business: 0.75,
					wellness: 0.7,
					gourmet: 0.65,
				},
				sustainabilityScore: 0.72,
			};
		}
	}

	async checkAvailability(params: {
		hotelId: string;
		checkIn: string;
		checkOut: string;
		adults: number;
		children?: number;
		rooms?: number;
	}): Promise<any> {
		try {
			const response = await this.client.get(
				`/hotels/${params.hotelId}/availability`,
				{
					params: {
						checkin: params.checkIn,
						checkout: params.checkOut,
						adults: params.adults,
						children: params.children || 0,
						rooms: params.rooms || 1,
					},
				},
			);

			return response.data.data;
		} catch (error) {
			logger.error('Failed to check availability', {
				error,
				params,
			});
			this.assertMockFallbackAllowed(
				'LiteAPI availability failed and mock fallback is disabled',
			);

			// Return mock availability data when API fails
			return {
				hotelId: params.hotelId,
				available: true,
				rooms: [
					{
						id: 'room-1',
						name: 'Deluxe King Room',
						type: 'Deluxe',
						description: 'Spacious room with king bed and city views',
						price: 250,
						currency: 'USD',
						available: 5,
						maxOccupancy: 2,
						capacity: 2,
						images: [
							'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', // Deluxe king bed main view
							'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800', // Deluxe room elegant seating
							'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', // City view from window
						],
						amenities: [
							'King Bed',
							'City View',
							'Mini Bar',
							'Work Desk',
							'Free WiFi',
							'Air Conditioning',
						],
						availability: true,
					},
					{
						id: 'room-2',
						name: 'Twin Beds Room',
						type: 'Standard',
						description: 'Comfortable room with two twin beds',
						price: 180,
						currency: 'USD',
						available: 3,
						maxOccupancy: 2,
						capacity: 2,
						images: [
							'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', // Standard twin room
							'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', // Twin room bathroom
							'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', // Standard room workspace
						],
						amenities: [
							'Twin Beds',
							'Free WiFi',
							'Air Conditioning',
							'Safe',
							'Coffee Maker',
						],
						availability: true,
					},
					{
						id: 'room-3',
						name: 'Executive Suite',
						type: 'Suite',
						description:
							'Luxurious suite with separate living area and premium amenities',
						price: 450,
						currency: 'USD',
						available: 2,
						maxOccupancy: 4,
						capacity: 4,
						images: [
							'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', // Executive suite luxury main
							'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800', // Suite living room
							'https://images.unsplash.com/photo-1560448075-bb485b067938?w=800', // Suite balcony view
						],
						amenities: [
							'King Bed',
							'Living Room',
							'Kitchen',
							'Balcony',
							'Jacuzzi',
							'Ocean View',
						],
						availability: true,
					},
					{
						id: 'room-4',
						name: 'Family Room',
						type: 'Family',
						description: 'Perfect for families with queen bed and bunk beds',
						price: 320,
						currency: 'USD',
						available: 4,
						maxOccupancy: 4,
						capacity: 4,
						images: [
							'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', // Family room main
							'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', // Kids bunk bed area
							'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800', // Family room seating
						],
						amenities: [
							'Queen Bed',
							'Bunk Beds',
							'Kids Area',
							'Game Console',
							'Mini Fridge',
						],
						availability: true,
					},
				],
			};
		}
	}

	async getRoomRates(params: {
		hotelId: string;
		roomId: string;
		checkIn: string;
		checkOut: string;
		adults: number;
		children?: number;
	}): Promise<any> {
		try {
			const response = await this.client.get(
				`/hotels/${params.hotelId}/rooms/${params.roomId}/rates`,
				{
					params: {
						checkin: params.checkIn,
						checkout: params.checkOut,
						adults: params.adults,
						children: params.children || 0,
					},
				},
			);

			return response.data.data;
		} catch (error) {
			logger.error('Failed to get room rates', { error, params });
			throw new Error('Failed to get room rates.');
		}
	}

	async createBooking(bookingData: {
		hotelId: string;
		roomId: string;
		checkIn: string;
		checkOut: string;
		guest: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
		};
		adults: number;
		children?: number;
		specialRequests?: string;
		rateId: string;
	}): Promise<{
		bookingId: string;
		confirmationNumber: string;
		status: string;
	}> {
		try {
			const response = await this.client.post('/bookings', {
				hotel_id: bookingData.hotelId,
				room_id: bookingData.roomId,
				rate_id: bookingData.rateId,
				checkin: bookingData.checkIn,
				checkout: bookingData.checkOut,
				guest: {
					first_name: bookingData.guest.firstName,
					last_name: bookingData.guest.lastName,
					email: bookingData.guest.email,
					phone: bookingData.guest.phone,
				},
				adults: bookingData.adults,
				children: bookingData.children || 0,
				special_requests: bookingData.specialRequests,
			});

			return {
				bookingId: response.data.data.booking_id,
				confirmationNumber: response.data.data.confirmation_number,
				status: response.data.data.status,
			};
		} catch (error) {
			logger.error(
				'Failed to create booking with LiteAPI',
				{ error, bookingData },
			);
			this.assertMockFallbackAllowed(
				'LiteAPI booking failed and mock fallback is disabled',
			);

			// Return mock booking confirmation when API fails
			const mockBookingId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const mockConfirmationNumber = `CNF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

			return {
				bookingId: mockBookingId,
				confirmationNumber: mockConfirmationNumber,
				status: 'confirmed',
			};
		}
	}

	async cancelBooking(
		bookingId: string,
		reason?: string,
	): Promise<{
		status: string;
		refundAmount?: number;
	}> {
		try {
			const response = await this.client.delete(`/bookings/${bookingId}`, {
				data: { reason },
			});

			return {
				status: response.data.data.status,
				refundAmount: response.data.data.refund_amount,
			};
		} catch (error) {
			logger.error('Failed to cancel booking', { error, bookingId });
			throw new Error('Failed to cancel booking.');
		}
	}

	async getBookingDetails(bookingId: string): Promise<any> {
		try {
			const response = await this.client.get(`/bookings/${bookingId}`);
			return response.data.data;
		} catch (error) {
			logger.error('Failed to get booking details', { error, bookingId });
			throw new Error('Failed to get booking details.');
		}
	}

	async syncHotelData(hotelIds: string[]): Promise<void> {
		try {
			const batchSize = 10;
			for (let i = 0; i < hotelIds.length; i += batchSize) {
				const batch = hotelIds.slice(i, i + batchSize);
				await Promise.all(
					batch.map(async (hotelId) => {
						try {
							const hotelData = await this.getHotelDetails(hotelId);
							// Store in database
							await this.storeHotelData(hotelData);
						} catch (error) {
							logger.error('Failed to sync hotel', { error, hotelId });
						}
					}),
				);
			}

			logger.info('Hotel data sync completed', { count: hotelIds.length });
		} catch (error) {
			logger.error('Failed to sync hotel data', { error });
			throw error;
		}
	}

	private async storeHotelData(hotelData: any): Promise<void> {
		// Implementation would store hotel data in the database
		// This is a placeholder for the actual implementation
		logger.info('Storing hotel data', { hotelId: hotelData.id });
	}
}

export const liteApiService = new LiteAPIService();
