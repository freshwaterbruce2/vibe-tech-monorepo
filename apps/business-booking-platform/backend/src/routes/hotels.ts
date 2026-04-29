import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import { aiSearchService } from '../services/aiSearchService';
import { cacheService } from '../services/cacheService';
import { liteApiService } from '../services/liteApiService';
import { logger } from '../utils/logger';

export const hotelsRouter = Router();

// Validation schemas
const searchHotelsSchema = z.object({
	query: z.string().optional(),
	destination: z.string().optional(),
	checkIn: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	checkOut: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	adults: z.coerce.number().min(1).max(10).default(1),
	children: z.coerce.number().min(0).max(8).default(0),
	rooms: z.coerce.number().min(1).max(5).default(1),
	priceMin: z.coerce.number().min(0).optional(),
	priceMax: z.coerce.number().min(0).optional(),
	starRating: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',').map(Number) : undefined)),
	amenities: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',') : undefined)),
	passions: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',') : undefined)),
	sortBy: z
		.enum(['price', 'rating', 'distance', 'popularity'])
		.default('popularity'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
	limit: z.coerce.number().min(1).max(100).default(20),
	offset: z.coerce.number().min(0).default(0),
});

const hotelDetailsSchema = z.object({
	hotelId: z.string().uuid(),
});

const availabilitySchema = z.object({
	hotelId: z.string().uuid(),
	checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	adults: z.coerce.number().min(1).max(10).default(1),
	children: z.coerce.number().min(0).max(8).default(0),
	rooms: z.coerce.number().min(1).max(5).default(1),
});

const roomRatesSchema = z.object({
	hotelId: z.string().uuid(),
	roomId: z.string().uuid(),
	checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	adults: z.coerce.number().min(1).max(10).default(1),
	children: z.coerce.number().min(0).max(8).default(0),
});

type SearchHotelsInput = z.infer<typeof searchHotelsSchema>;
type AvailabilityInput = z.infer<typeof availabilitySchema>;
type RoomRatesInput = z.infer<typeof roomRatesSchema>;

// Passion matching algorithm
const calculatePassionScore = (hotel: any, passions: string[]): number => {
	if (!passions || passions.length === 0) {
return 0;
}

	const passionKeywords: Record<string, string[]> = {
		'gourmet-foodie': [
			'restaurant',
			'dining',
			'cuisine',
			'chef',
			'culinary',
			'food',
			'bar',
			'wine',
		],
		'outdoor-adventure': [
			'hiking',
			'adventure',
			'outdoor',
			'nature',
			'mountain',
			'trail',
			'sports',
			'activity',
		],
		'wellness-spa': [
			'spa',
			'wellness',
			'massage',
			'relaxation',
			'therapy',
			'health',
			'meditation',
			'yoga',
		],
		'cultural-explorer': [
			'museum',
			'culture',
			'historic',
			'art',
			'heritage',
			'local',
			'traditional',
			'tour',
		],
		'luxury-indulgence': [
			'luxury',
			'premium',
			'suite',
			'concierge',
			'exclusive',
			'high-end',
			'deluxe',
			'vip',
		],
		'business-networking': [
			'business',
			'conference',
			'meeting',
			'wifi',
			'workspace',
			'center',
			'professional',
		],
		'romantic-getaway': [
			'romantic',
			'couple',
			'honeymoon',
			'private',
			'intimate',
			'sunset',
			'special',
			'romance',
		],
	};

	let totalScore = 0;
	const description = (hotel.description || '').toLowerCase();
	const amenitiesList = (hotel.amenities || []).join(' ').toLowerCase();
	const hotelName = (hotel.name || '').toLowerCase();
	const combined = `${description} ${amenitiesList} ${hotelName}`;

	passions.forEach((passion) => {
		const keywords = passionKeywords[passion] || [];
		let passionScore = 0;

		keywords.forEach((keyword) => {
			const keywordCount = (combined.match(new RegExp(keyword, 'g')) || [])
				.length;
			passionScore += keywordCount * 10;
		});

		// Bonus for star rating alignment
		if (passion === 'luxury-indulgence' && hotel.starRating >= 4) {
			passionScore += 20;
		}
		if (passion === 'business-networking' && hotel.starRating >= 3) {
			passionScore += 15;
		}

		totalScore += passionScore;
	});

	return Math.min(totalScore, 100); // Cap at 100
};

// POST /api/hotels/search - Main hotel search endpoint
hotelsRouter.post(
	'/search',
	validateRequest(searchHotelsSchema),
	async (req, res) => {
		try {
			const params = req.body as SearchHotelsInput;
			logger.info('Hotel search request', { params });

			const searchParams = params;

			// If natural language query is provided, parse it with AI
			if (params.query && !params.destination) {
				try {
					const aiParsed = await aiSearchService.parseNaturalLanguageQuery(
						params.query,
					);

					// Override with AI-parsed values where available
					if (aiParsed.location?.city) {
						searchParams.destination = `${aiParsed.location.city}${aiParsed.location.country ? `, ${aiParsed.location.country}` : ''}`;
					}
					if (aiParsed.dates?.checkIn) {
searchParams.checkIn = aiParsed.dates.checkIn;
}
					if (aiParsed.dates?.checkOut) {
searchParams.checkOut = aiParsed.dates.checkOut;
}
					if (aiParsed.guests?.adults) {
searchParams.adults = aiParsed.guests.adults;
}
					if (aiParsed.guests?.children) {
searchParams.children = aiParsed.guests.children;
}
					if (aiParsed.guests?.rooms) {
searchParams.rooms = aiParsed.guests.rooms;
}
					if (aiParsed.priceRange?.min) {
searchParams.priceMin = aiParsed.priceRange.min;
}
					if (aiParsed.priceRange?.max) {
searchParams.priceMax = aiParsed.priceRange.max;
}
					if (aiParsed.amenities) {
searchParams.amenities = aiParsed.amenities;
}
					if (aiParsed.starRating) {
searchParams.starRating = aiParsed.starRating;
}
					if (aiParsed.passions) {
searchParams.passions = aiParsed.passions;
}

					logger.info('AI parsed query successfully', {
						original: params.query,
						parsed: aiParsed,
					});
				} catch (aiError) {
					logger.warn('AI parsing failed, using original params', {
						error: aiError,
					});
				}
			}

			// Validate required parameters
			if (!searchParams.destination) {
				return res.status(400).json({
					error: 'Validation Error',
					message: 'Destination is required for hotel search',
				});
			}

			if (!searchParams.checkIn || !searchParams.checkOut) {
				return res.status(400).json({
					error: 'Validation Error',
					message: 'Check-in and check-out dates are required',
				});
			}

			// Validate dates
			const checkInDate = new Date(searchParams.checkIn);
			const checkOutDate = new Date(searchParams.checkOut);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (checkInDate < today) {
				return res.status(400).json({
					error: 'Validation Error',
					message: 'Check-in date cannot be in the past',
				});
			}

			if (checkOutDate <= checkInDate) {
				return res.status(400).json({
					error: 'Validation Error',
					message: 'Check-out date must be after check-in date',
				});
			}

			// Search hotels using LiteAPI
			const hotels = await liteApiService.searchHotels({
				destination: searchParams.destination,
				checkIn: searchParams.checkIn,
				checkOut: searchParams.checkOut,
				adults: searchParams.adults,
				children: searchParams.children,
				rooms: searchParams.rooms,
				priceMin: searchParams.priceMin,
				priceMax: searchParams.priceMax,
				starRating: searchParams.starRating,
				amenities: searchParams.amenities,
				limit: searchParams.limit,
				offset: searchParams.offset,
			});

			// Apply passion-based scoring if passions are specified
			let processedHotels = hotels;
			const passions = searchParams.passions ?? [];
			if (passions.length > 0) {
				processedHotels = hotels.map((hotel) => ({
					...hotel,
					passionScore: calculatePassionScore(hotel, passions),
					matchedPassions: passions,
				}));

				// Sort by passion score if applicable
				if (searchParams.sortBy === 'popularity') {
					processedHotels.sort(
						(a, b) => (b.passionScore || 0) - (a.passionScore || 0),
					);
				}
			}

			// Apply sorting
			const sortField = searchParams.sortBy;
			const {sortOrder} = searchParams;

			if (sortField !== 'popularity' || !searchParams.passions) {
				processedHotels.sort((a, b) => {
					let aVal, bVal;

					switch (sortField) {
						case 'price':
							aVal = a.price?.amount || 0;
							bVal = b.price?.amount || 0;
							break;
						case 'rating':
							aVal = a.starRating || 0;
							bVal = b.starRating || 0;
							break;
						case 'distance':
							aVal = a.distance || 0;
							bVal = b.distance || 0;
							break;
						default:
							aVal = a.popularity || 0;
							bVal = b.popularity || 0;
					}

					return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
				});
			}

			// Enhance descriptions with AI if needed
			if (processedHotels.length > 0 && processedHotels.length <= 10) {
				try {
					processedHotels =
						await aiSearchService.enhanceHotelDescriptions(processedHotels);
				} catch (enhanceError) {
					logger.warn('Failed to enhance hotel descriptions', {
						error: enhanceError,
					});
				}
			}

			return res.json({
				success: true,
				data: {
					hotels: processedHotels,
					pagination: {
						total: processedHotels.length,
						offset: searchParams.offset,
						limit: searchParams.limit,
						hasMore: processedHotels.length === searchParams.limit,
					},
					searchParams: {
						destination: searchParams.destination,
						checkIn: searchParams.checkIn,
						checkOut: searchParams.checkOut,
						adults: searchParams.adults,
						children: searchParams.children,
						rooms: searchParams.rooms,
						passions: searchParams.passions,
					},
				},
			});
		} catch (error) {
			logger.error('Hotel search failed', { error, params: req.body });
			return res.status(500).json({
				error: 'Search Error',
				message: 'Failed to search hotels. Please try again.',
			});
		}
	},
);

// GET /api/hotels/:hotelId - Get hotel details
hotelsRouter.get(
	'/:hotelId',
	validateRequest(hotelDetailsSchema, 'params'),
	async (req, res) => {
		try {
			const hotelId = req.params.hotelId as string;

			// Try to get from cache first
			const cacheKey = `hotel:details:${hotelId}`;
			const cached = await cacheService.get(cacheKey);
			if (cached) {
				return res.json({ success: true, data: cached });
			}

			// Get hotel details from LiteAPI
			const hotelDetails = await liteApiService.getHotelDetails(hotelId);

			// Cache the result
			await cacheService.set(cacheKey, hotelDetails, 300); // 5 minutes

			return res.json({
				success: true,
				data: hotelDetails,
			});
		} catch (error) {
			logger.error('Failed to get hotel details', {
				error,
				hotelId: req.params.hotelId,
			});
			return res.status(500).json({
				error: 'Fetch Error',
				message: 'Failed to get hotel details. Please try again.',
			});
		}
	},
);

// GET /api/hotels/:hotelId/availability - Check hotel availability
hotelsRouter.get(
	'/:hotelId/availability',
	validateRequest(availabilitySchema, 'query'),
	async (req, res) => {
		try {
			const hotelId = req.params.hotelId as string;
			const { checkIn, checkOut, adults, children, rooms } =
				req.query as unknown as AvailabilityInput;

			const availability = await liteApiService.checkAvailability({
				hotelId,
				checkIn,
				checkOut,
				adults,
				children,
				rooms,
			});

			return res.json({
				success: true,
				data: availability,
			});
		} catch (error) {
			logger.error('Failed to check availability', {
				error,
				params: req.params,
				query: req.query,
			});
			return res.status(500).json({
				error: 'Availability Error',
				message: 'Failed to check room availability. Please try again.',
			});
		}
	},
);

// GET /api/hotels/:hotelId/rooms/:roomId/rates - Get room rates
hotelsRouter.get(
	'/:hotelId/rooms/:roomId/rates',
	validateRequest(roomRatesSchema, 'query'),
	async (req, res) => {
		try {
			const hotelId = req.params.hotelId as string;
			const roomId = req.params.roomId as string;
			const { checkIn, checkOut, adults, children } =
				req.query as unknown as RoomRatesInput;

			const rates = await liteApiService.getRoomRates({
				hotelId,
				roomId,
				checkIn,
				checkOut,
				adults,
				children,
			});

			return res.json({
				success: true,
				data: rates,
			});
		} catch (error) {
			logger.error('Failed to get room rates', {
				error,
				params: req.params,
				query: req.query,
			});
			return res.status(500).json({
				error: 'Rates Error',
				message: 'Failed to get room rates. Please try again.',
			});
		}
	},
);

// GET /api/hotels/search/suggestions - Get search suggestions
hotelsRouter.get('/search/suggestions', async (req, res) => {
	try {
		const { q: query } = req.query as { q?: string };

		if (!query || query.length < 2) {
			return res.json({
				success: true,
				data: {
					suggestions: [],
				},
			});
		}

		const suggestions = await aiSearchService.generateSearchSuggestions(query, {
			popularDestinations: ['New York', 'Paris', 'London', 'Tokyo', 'Dubai'],
		});

		return res.json({
			success: true,
			data: {
				suggestions,
			},
		});
	} catch (error) {
		logger.error('Failed to get search suggestions', {
			error,
			query: req.query,
		});
		return res.json({
			success: true,
			data: {
				suggestions: [],
			},
		});
	}
});

// GET /api/hotels/destinations/popular - Get popular destinations
hotelsRouter.get('/destinations/popular', async (_req, res) => {
	try {
		// This could be enhanced to use real data from database
		const popularDestinations = [
			{
				id: 'new-york',
				name: 'New York',
				country: 'United States',
				image: '/images/destinations/new-york.jpg',
				hotelCount: 2500,
				avgPrice: 250,
			},
			{
				id: 'paris',
				name: 'Paris',
				country: 'France',
				image: '/images/destinations/paris.jpg',
				hotelCount: 1800,
				avgPrice: 200,
			},
			{
				id: 'london',
				name: 'London',
				country: 'United Kingdom',
				image: '/images/destinations/london.jpg',
				hotelCount: 2200,
				avgPrice: 180,
			},
			{
				id: 'tokyo',
				name: 'Tokyo',
				country: 'Japan',
				image: '/images/destinations/tokyo.jpg',
				hotelCount: 1500,
				avgPrice: 160,
			},
			{
				id: 'dubai',
				name: 'Dubai',
				country: 'United Arab Emirates',
				image: '/images/destinations/dubai.jpg',
				hotelCount: 800,
				avgPrice: 300,
			},
		];

		return res.json({
			success: true,
			data: {
				destinations: popularDestinations,
			},
		});
	} catch (error) {
		logger.error('Failed to get popular destinations', { error });
		return res.status(500).json({
			error: 'Fetch Error',
			message: 'Failed to get popular destinations.',
		});
	}
});

// POST /api/hotels/compare - Compare multiple hotels
hotelsRouter.post('/compare', async (req, res) => {
	try {
		const { hotelIds } = req.body as { hotelIds?: string[] };

		if (
			!Array.isArray(hotelIds) ||
			hotelIds.length === 0 ||
			hotelIds.length > 5
		) {
			return res.status(400).json({
				error: 'Validation Error',
				message: 'Please provide 1-5 hotel IDs to compare',
			});
		}

		// Get details for all hotels
		const hotelDetails = await Promise.all(
			hotelIds.map(async (hotelId) => {
				try {
					return await liteApiService.getHotelDetails(hotelId);
				} catch (error) {
					logger.warn('Failed to get hotel details for comparison', {
						hotelId,
						error,
					});
					return null;
				}
			}),
		);

		// Filter out failed requests
		const validHotels = hotelDetails.filter((hotel) => hotel !== null);

		return res.json({
			success: true,
			data: {
				hotels: validHotels,
				comparison: {
					priceRange: {
						min: Math.min(...validHotels.map((h) => h.price?.amount || 0)),
						max: Math.max(...validHotels.map((h) => h.price?.amount || 0)),
					},
					ratingRange: {
						min: Math.min(...validHotels.map((h) => h.starRating || 0)),
						max: Math.max(...validHotels.map((h) => h.starRating || 0)),
					},
					commonAmenities:
						validHotels.length > 0
							? (validHotels[0].amenities as string[] | undefined)?.filter((amenity) =>
									validHotels.every((hotel) =>
										hotel.amenities?.includes(amenity),
									),
								) || []
							: [],
				},
			},
		});
	} catch (error) {
		logger.error('Failed to compare hotels', { error, body: req.body });
		return res.status(500).json({
			error: 'Comparison Error',
			message: 'Failed to compare hotels. Please try again.',
		});
	}
});
