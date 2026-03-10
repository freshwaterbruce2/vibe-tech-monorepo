/**
 * AI Search Service - Migrated to OpenRouter (2026-01-24)
 *
 * Previously used OpenAI directly (gpt-4-turbo-preview)
 * Now uses OpenRouter for cost savings and model flexibility:
 * - DeepSeek Chat: ~$0.0003/1M tokens (vs OpenAI GPT-4: $10/1M)
 * - Gemini 2.0 Flash: FREE fallback
 * - GPT-4 Turbo: Available via OpenRouter when needed
 */

import { z } from 'zod';
import { config } from '../config';
import { logger } from '../utils/logger';
import { openRouterClient } from './openRouterClient';

// Schema for parsed search query
const ParsedSearchQuerySchema = z.object({
	location: z
		.object({
			city: z.string().optional(),
			country: z.string().optional(),
			region: z.string().optional(),
			coordinates: z
				.object({
					lat: z.number(),
					lng: z.number(),
				})
				.optional(),
		})
		.optional(),
	dates: z
		.object({
			checkIn: z.string(),
			checkOut: z.string(),
		})
		.optional(),
	guests: z
		.object({
			adults: z.number().default(1),
			children: z.number().default(0),
			rooms: z.number().default(1),
		})
		.optional(),
	priceRange: z
		.object({
			min: z.number().optional(),
			max: z.number().optional(),
			currency: z.string().default('USD'),
		})
		.optional(),
	amenities: z.array(z.string()).optional(),
	hotelType: z.array(z.string()).optional(),
	starRating: z.array(z.number()).optional(),
	preferences: z
		.object({
			nearBeach: z.boolean().optional(),
			petFriendly: z.boolean().optional(),
			businessFriendly: z.boolean().optional(),
			familyFriendly: z.boolean().optional(),
			romantic: z.boolean().optional(),
			luxury: z.boolean().optional(),
			budget: z.boolean().optional(),
			sustainable: z.boolean().optional(),
		})
		.optional(),
	activities: z.array(z.string()).optional(),
	passions: z.array(z.string()).optional(),
});

export type ParsedSearchQuery = z.infer<typeof ParsedSearchQuerySchema>;

export class AISearchService {
	constructor() {
		// OpenRouter client is a singleton, no initialization needed
	}

	async parseNaturalLanguageQuery(
		query: string,
		context?: {
			userLocation?: { lat: number; lng: number };
			previousSearches?: string[];
			userPreferences?: Record<string, any>;
		},
	): Promise<ParsedSearchQuery> {
		try {
			const systemPrompt = `You are a hotel search assistant that converts natural language queries into structured search parameters.
      
      Extract the following information from user queries:
      - Location (city, country, region, or coordinates)
      - Check-in and check-out dates (return in ISO format YYYY-MM-DD)
      - Number of guests (adults, children) and rooms
      - Price range and currency
      - Desired amenities (wifi, pool, gym, spa, parking, etc.)
      - Hotel type (resort, boutique, business, airport, etc.)
      - Star rating preferences
      - Special preferences (pet-friendly, beach access, romantic, family-friendly, etc.)
      - Activities or experiences they're interested in
      - Passions or interests (adventure, wellness, culture, food, etc.)
      
      Current date: ${new Date().toISOString().split('T')[0]}
      
      Return a valid JSON object matching the schema. If dates are not specified, suggest reasonable defaults.
      If location is vague, ask for clarification in the response.`;

			const userPrompt = `Query: "${query}"
      ${context?.userLocation ? `User's current location: ${context.userLocation.lat}, ${context.userLocation.lng}` : ''}
      ${context?.previousSearches ? `Previous searches: ${context.previousSearches.join(', ')}` : ''}`;

			const parsedData = await openRouterClient.completeJSON<any>(
				systemPrompt,
				userPrompt,
				{
					temperature: config.openai.temperature || 0.7,
					max_tokens: config.openai.maxTokens || 1000,
				},
			);

			const validatedData = ParsedSearchQuerySchema.parse(parsedData);

			logger.info('Successfully parsed natural language query', {
				originalQuery: query,
				parsedData: validatedData,
			});

			return validatedData;
		} catch (error) {
			logger.error('Failed to parse natural language query', { error, query });
			throw new Error(
				'Failed to understand your search query. Please try rephrasing.',
			);
		}
	}

	async generateSearchSuggestions(
		partialQuery: string,
		context?: {
			recentSearches?: string[];
			popularDestinations?: string[];
		},
	): Promise<string[]> {
		try {
			const systemPrompt =
				"Generate 5 relevant hotel search suggestions based on the partial query. Return as a JSON object with 'suggestions' array of strings.";

			const userPrompt = `Partial query: "${partialQuery}"
Recent searches: ${context?.recentSearches?.join(', ') || 'none'}
Popular destinations: ${context?.popularDestinations?.join(', ') || 'none'}`;

			const result = await openRouterClient.completeJSON<{
				suggestions: string[];
			}>(systemPrompt, userPrompt, {
				temperature: 0.7,
				max_tokens: 200,
			});

			return Array.isArray(result.suggestions)
				? result.suggestions.slice(0, 5)
				: [];
		} catch (error) {
			logger.error('Failed to generate search suggestions', {
				error,
				partialQuery,
			});
			return [];
		}
	}

	async enhanceHotelDescriptions(hotels: any[]): Promise<any[]> {
		try {
			const systemPrompt =
				'Create a compelling, concise hotel description (max 100 words) highlighting unique features and appeal.';

			const enhancedHotels = await Promise.all(
				hotels.map(async (hotel) => {
					try {
						const userPrompt = `Hotel: ${hotel.name}
Location: ${hotel.city}, ${hotel.country}
Amenities: ${hotel.amenities.join(', ')}
Rating: ${hotel.rating}/5
Original description: ${hotel.description}`;

						const enhancedDescription = await openRouterClient.complete(
							systemPrompt,
							userPrompt,
							{
								temperature: 0.8,
								max_tokens: 150,
							},
						);

						return {
							...hotel,
							aiEnhancedDescription: enhancedDescription,
						};
					} catch (error) {
						logger.warn('Failed to enhance description for single hotel', {
							hotelName: hotel.name,
							error,
						});
						return hotel; // Return original if single enhancement fails
					}
				}),
			);

			return enhancedHotels;
		} catch (error) {
			logger.error('Failed to enhance hotel descriptions', { error });
			return hotels; // Return original hotels if enhancement fails
		}
	}

	async analyzeUserIntent(query: string): Promise<{
		intent: 'search' | 'booking' | 'question' | 'support';
		confidence: number;
		entities: Record<string, any>;
	}> {
		try {
			const systemPrompt = `Analyze the user's intent from their message. Classify as:
- search: Looking for hotels
- booking: Ready to book or asking about booking process
- question: General questions about hotels or services
- support: Need help or have issues

Return JSON with intent, confidence (0-1), and extracted entities.`;

			const result = await openRouterClient.completeJSON<{
				intent: 'search' | 'booking' | 'question' | 'support';
				confidence: number;
				entities: Record<string, any>;
			}>(systemPrompt, query, {
				temperature: 0.3,
				max_tokens: 200,
			});

			return result;
		} catch (error) {
			logger.error('Failed to analyze user intent', { error, query });
			return {
				intent: 'search',
				confidence: 0.5,
				entities: {},
			};
		}
	}

	async generatePersonalizedRecommendations(userData: {
		previousBookings?: any[];
		searchHistory?: string[];
		preferences?: Record<string, any>;
		currentLocation?: { lat: number; lng: number };
	}): Promise<{
		destinations: string[];
		hotelTypes: string[];
		experiences: string[];
		priceRange: { min: number; max: number };
	}> {
		try {
			const systemPrompt =
				'Generate personalized hotel recommendations based on user data. Return JSON with destinations, hotel types, experiences, and price range suggestions.';

			const userDataStr = JSON.stringify(userData, null, 2);

			const result = await openRouterClient.completeJSON<{
				destinations: string[];
				hotelTypes: string[];
				experiences: string[];
				priceRange: { min: number; max: number };
			}>(systemPrompt, userDataStr, {
				temperature: 0.7,
				max_tokens: 500,
			});

			return result;
		} catch (error) {
			logger.error('Failed to generate personalized recommendations', {
				error,
			});
			return {
				destinations: [],
				hotelTypes: [],
				experiences: [],
				priceRange: { min: 0, max: 500 },
			};
		}
	}
}

export const aiSearchService = new AISearchService();
