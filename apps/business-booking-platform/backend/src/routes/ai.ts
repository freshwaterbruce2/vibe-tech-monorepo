import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database';
import { aiFeedback } from '../database/schema';
import { validateRequest } from '../middleware/validateRequest';
import { aiSearchService } from '../services/aiSearchService';
import { logger } from '../utils/logger';

export const aiRouter = Router();

// Validation schemas
const parseQuerySchema = z.object({
	query: z.string().min(1).max(500),
	context: z
		.object({
			userLocation: z
				.object({
					lat: z.number(),
					lng: z.number(),
				})
				.optional(),
			previousSearches: z.array(z.string()).optional(),
			userPreferences: z.record(z.string(), z.any()).optional(),
		})
		.optional(),
});

const generateSuggestionsSchema = z.object({
	query: z.string().min(1).max(100),
	context: z
		.object({
			recentSearches: z.array(z.string()).optional(),
			popularDestinations: z.array(z.string()).optional(),
		})
		.optional(),
});

const analyzeIntentSchema = z.object({
	query: z.string().min(1).max(500),
});

const generateRecommendationsSchema = z.object({
	userData: z.object({
		previousBookings: z.array(z.any()).optional(),
		searchHistory: z.array(z.string()).optional(),
		preferences: z.record(z.string(), z.any()).optional(),
		currentLocation: z
			.object({
				lat: z.number(),
				lng: z.number(),
			})
			.optional(),
	}),
});

// POST /api/ai/parse-query - Parse natural language search query
aiRouter.post(
	'/parse-query',
	validateRequest(parseQuerySchema),
	async (req, res) => {
		try {
			const { query, context } = req.body;

			logger.info('AI query parsing request', { query, hasContext: !!context });

			const parsedQuery = await aiSearchService.parseNaturalLanguageQuery(
				query,
				context,
			);

			res.json({
				success: true,
				data: {
					originalQuery: query,
					parsedQuery,
					confidence: 0.85, // Could be enhanced with actual confidence scoring
				},
			});
		} catch (error) {
			logger.error('AI query parsing failed', { error, query: req.body.query });
			res.status(500).json({
				error: 'AI Error',
				message:
					'Failed to parse search query. Please try rephrasing your request.',
			});
		}
	},
);

// GET /api/ai/suggestions - Generate search suggestions
aiRouter.get(
	'/suggestions',
	validateRequest(generateSuggestionsSchema, 'query'),
	async (req, res) => {
		try {
			const { query, context } = req.query as any;

			if (!query || typeof query !== 'string' || query.length < 2) {
				res.json({
					success: true,
					data: {
						suggestions: [],
					},
				});
				return;
			}

			const suggestions = await aiSearchService.generateSearchSuggestions(
				query,
				context,
			);

			res.json({
				success: true,
				data: {
					query,
					suggestions,
				},
			});
			return;
		} catch (error) {
			logger.error('AI suggestions generation failed', {
				error,
				query: req.query.query,
			});
			// Return empty suggestions on error to avoid breaking user experience
			res.json({
				success: true,
				data: {
					suggestions: [],
				},
			});
		}
	},
);

// POST /api/ai/analyze-intent - Analyze user intent from query
aiRouter.post(
	'/analyze-intent',
	validateRequest(analyzeIntentSchema),
	async (req, res) => {
		try {
			const { query } = req.body;

			const intentAnalysis = await aiSearchService.analyzeUserIntent(query);

			res.json({
				success: true,
				data: {
					query,
					analysis: intentAnalysis,
				},
			});
		} catch (error) {
			logger.error('AI intent analysis failed', {
				error,
				query: req.body.query,
			});
			res.status(500).json({
				error: 'AI Error',
				message: 'Failed to analyze user intent',
			});
		}
	},
);

// POST /api/ai/recommendations - Generate personalized recommendations
aiRouter.post(
	'/recommendations',
	validateRequest(generateRecommendationsSchema),
	async (req, res) => {
		try {
			const { userData } = req.body;

			const recommendations =
				await aiSearchService.generatePersonalizedRecommendations(userData);

			res.json({
				success: true,
				data: {
					recommendations,
					generatedAt: new Date().toISOString(),
				},
			});
		} catch (error) {
			logger.error('AI recommendations generation failed', { error });
			res.status(500).json({
				error: 'AI Error',
				message: 'Failed to generate personalized recommendations',
			});
		}
	},
);

// POST /api/ai/enhance-descriptions - Enhance hotel descriptions
aiRouter.post('/enhance-descriptions', async (req, res) => {
	try {
		const { hotels } = req.body;

		if (!Array.isArray(hotels) || hotels.length === 0) {
			return res.status(400).json({
				error: 'Validation Error',
				message: 'Hotels array is required and must not be empty',
			});
		}

		if (hotels.length > 20) {
			return res.status(400).json({
				error: 'Validation Error',
				message: 'Cannot enhance more than 20 hotel descriptions at once',
			});
		}

		const enhancedHotels =
			await aiSearchService.enhanceHotelDescriptions(hotels);

		return res.json({
			success: true,
			data: {
				hotels: enhancedHotels,
				enhanced: enhancedHotels.length,
			},
		});
	} catch (error) {
		logger.error('AI description enhancement failed', { error });
		return res.status(500).json({
			error: 'AI Error',
			message: 'Failed to enhance hotel descriptions',
		});
	}
});

// GET /api/ai/capabilities - Get AI service capabilities
aiRouter.get('/capabilities', async (_req, res) => {
	try {
		const capabilities = {
			naturalLanguageProcessing: {
				queryParsing: {
					supported: true,
					languages: ['en'],
					features: [
						'location_extraction',
						'date_parsing',
						'guest_count_detection',
						'amenity_detection',
						'preference_analysis',
						'passion_matching',
					],
				},
				intentAnalysis: {
					supported: true,
					intents: ['search', 'booking', 'question', 'support'],
				},
				suggestions: {
					supported: true,
					maxSuggestions: 5,
				},
			},
			personalization: {
				recommendations: {
					supported: true,
					factors: [
						'previous_bookings',
						'search_history',
						'user_preferences',
						'location_context',
					],
				},
				contentEnhancement: {
					supported: true,
					maxHotels: 20,
				},
			},
			availability: {
				status: 'active',
				uptime: '99.9%',
				averageResponseTime: '2.5s',
			},
		};

		res.json({
			success: true,
			data: capabilities,
		});
	} catch (error) {
		logger.error('Failed to get AI capabilities', { error });
		res.status(500).json({
			error: 'Service Error',
			message: 'Failed to get AI capabilities',
		});
	}
});

// POST /api/ai/feedback - Submit feedback on AI responses
aiRouter.post('/feedback', async (req, res) => {
	try {
		// Validate feedback
		const feedbackSchema = z.object({
			queryId: z.string().optional(),
			rating: z.number().min(1).max(5),
			feedback: z.string().max(1000).optional(),
			type: z.enum([
				'query_parsing',
				'suggestions',
				'recommendations',
				'descriptions',
			]),
			searchQuery: z.string().optional(),
			aiResponse: z.string().optional(),
		});

		const validatedFeedback = feedbackSchema.parse(req.body);

		// Store feedback for AI model improvement
		logger.info('AI feedback received', {
			...validatedFeedback,
			userId: req.user?.id,
			timestamp: new Date().toISOString(),
		});

		// Store feedback in database for analysis and model improvement
		try {
			const db = await getDb();
			await db.insert(aiFeedback).values({
				userId: req.user?.id,
				feedbackType: validatedFeedback.type,
				rating: validatedFeedback.rating,
				comment: validatedFeedback.feedback,
				searchQuery: validatedFeedback.searchQuery,
				aiResponse: validatedFeedback.aiResponse,
				metadata: {
					timestamp: new Date().toISOString(),
					userAgent: req.get('User-Agent'),
				},
			});
			logger.info('AI feedback stored in database');
		} catch (dbError) {
			logger.error('Failed to store AI feedback in database:', dbError);
			// Continue processing even if database storage fails
		}

		res.json({
			success: true,
			message: 'Feedback received successfully',
		});
		return;
	} catch (error) {
		logger.error('Failed to process AI feedback', { error });
		res.status(400).json({
			error: 'Feedback Error',
			message: 'Invalid feedback data',
		});
	}
});

// GET /api/ai/health - AI service health check
aiRouter.get('/health', async (_req, res) => {
	try {
		// Test AI service with a simple query
		const testQuery = 'hotels in Paris';
		const startTime = Date.now();

		try {
			await aiSearchService.parseNaturalLanguageQuery(testQuery);
			const responseTime = Date.now() - startTime;

			res.json({
				success: true,
				data: {
					status: 'healthy',
					responseTime: `${responseTime}ms`,
					timestamp: new Date().toISOString(),
					services: {
						openai: 'connected',
						queryParsing: 'operational',
						suggestions: 'operational',
						recommendations: 'operational',
					},
				},
			});
		} catch (aiError) {
			res.status(503).json({
				success: false,
				error: 'Service Unavailable',
				message: 'AI service is currently unavailable',
				data: {
					status: 'unhealthy',
					error: 'OpenAI connection failed',
					timestamp: new Date().toISOString(),
				},
			});
		}
	} catch (error) {
		logger.error('AI health check failed', { error });
		res.status(500).json({
			success: false,
			error: 'Health Check Error',
			message: 'Failed to perform health check',
		});
	}
});
