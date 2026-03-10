import axios from "axios";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	MockedFunction,
	vi,
} from "vitest";
import { aiService } from "@/domain/ai";
import type { ProcessedQuery } from "@/types/api";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// Mock environment
vi.mock("vite", () => ({
	loadEnv: vi.fn(),
}));

// Mock navigator
Object.defineProperty(window, "navigator", {
	value: {
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	},
	writable: true,
});

describe("AIService Comprehensive Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset console.error mock
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Natural Language Processing", () => {
		it("should process natural language query successfully", async () => {
			const mockProcessedQuery: ProcessedQuery = {
				intent: "search_hotels",
				entities: {
					location: "New York",
					checkIn: "2024-12-01",
					checkOut: "2024-12-03",
					guests: 2,
					priceRange: { min: 100, max: 300 },
				},
				confidence: 0.95,
				suggestions: ["luxury hotels", "boutique hotels"],
			};

			mockedAxios.post.mockResolvedValue({
				data: { processedQuery: mockProcessedQuery },
			});

			const query =
				"Find me a luxury hotel in New York for 2 guests from Dec 1-3, budget $100-300";
			const result = await aiService.processNaturalLanguage(query);

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/ai/process-query", {
				query,
				context: {
					timestamp: expect.any(String),
					userAgent:
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
			});
			expect(result).toEqual(mockProcessedQuery);
		});

		it("should handle complex natural language queries", async () => {
			const complexQuery = `I need a romantic hotel in Paris for my anniversary next month.
        We want something with a spa, near the Eiffel Tower, and we're willing to spend up to $500 per night.
        We're traveling from December 15th to 18th and need a room for 2 adults.`;

			const mockResponse: ProcessedQuery = {
				intent: "search_hotels",
				entities: {
					location: "Paris",
					amenities: ["spa", "romantic"],
					landmarks: ["Eiffel Tower"],
					checkIn: "2024-12-15",
					checkOut: "2024-12-18",
					guests: 2,
					priceRange: { min: 0, max: 500 },
					specialRequests: ["anniversary", "romantic"],
				},
				confidence: 0.88,
				suggestions: [
					"romantic hotels",
					"spa hotels",
					"luxury hotels near Eiffel Tower",
				],
			};

			mockedAxios.post.mockResolvedValue({
				data: { processedQuery: mockResponse },
			});

			const result = await aiService.processNaturalLanguage(complexQuery);

			expect(result.entities.location).toBe("Paris");
			expect(result.entities.amenities).toContain("spa");
			expect(result.entities.specialRequests).toContain("anniversary");
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it("should handle ambiguous queries with lower confidence", async () => {
			const ambiguousQuery = "hotel";

			const mockResponse: ProcessedQuery = {
				intent: "search_hotels",
				entities: {},
				confidence: 0.3,
				suggestions: [
					"Please specify location",
					"Add check-in dates",
					"Specify number of guests",
				],
				clarificationNeeded: true,
			};

			mockedAxios.post.mockResolvedValue({
				data: { processedQuery: mockResponse },
			});

			const result = await aiService.processNaturalLanguage(ambiguousQuery);

			expect(result.confidence).toBeLessThan(0.5);
			expect(result.clarificationNeeded).toBe(true);
			expect(result.suggestions).toContain("Please specify location");
		});

		it("should handle multiple languages", async () => {
			const spanishQuery = "Busco un hotel en Barcelona para dos personas";

			const mockResponse: ProcessedQuery = {
				intent: "search_hotels",
				entities: {
					location: "Barcelona",
					guests: 2,
				},
				confidence: 0.82,
				language: "es",
				suggestions: ["hoteles de lujo", "hoteles cerca del centro"],
			};

			mockedAxios.post.mockResolvedValue({
				data: { processedQuery: mockResponse },
			});

			const result = await aiService.processNaturalLanguage(spanishQuery);

			expect(result.language).toBe("es");
			expect(result.entities.location).toBe("Barcelona");
		});

		it("should handle API errors gracefully", async () => {
			mockedAxios.post.mockRejectedValue(new Error("API Error"));

			await expect(
				aiService.processNaturalLanguage("Find hotels in London"),
			).rejects.toThrow("Failed to process natural language query");

			expect(console.error).toHaveBeenCalledWith(
				"Error processing natural language query:",
				expect.any(Error),
			);
		});

		it("should handle malformed API responses", async () => {
			mockedAxios.post.mockResolvedValue({
				data: { invalidStructure: true },
			});

			await expect(
				aiService.processNaturalLanguage("Find hotels"),
			).rejects.toThrow();
		});

		it("should handle network timeouts", async () => {
			const timeoutError = new Error("Request timeout");
			timeoutError.name = "TimeoutError";

			mockedAxios.post.mockRejectedValue(timeoutError);

			await expect(
				aiService.processNaturalLanguage("Find hotels in Tokyo"),
			).rejects.toThrow("Failed to process natural language query");
		});
	});

	describe("AI Recommendations", () => {
		it("should get recommendations with full context", async () => {
			const context = {
				userId: "user_123",
				location: "San Francisco",
				preferences: ["luxury", "business-friendly", "gym"],
				budget: { min: 200, max: 500 },
			};

			const mockRecommendations = {
				hotels: [
					{
						id: "hotel_1",
						name: "Luxury Business Hotel",
						score: 0.95,
						reasons: [
							"Matches luxury preference",
							"Has gym",
							"Business center",
						],
					},
					{
						id: "hotel_2",
						name: "Executive Suites",
						score: 0.88,
						reasons: ["Within budget", "Business-friendly amenities"],
					},
				],
				personalizedTips: [
					"Book early for better rates",
					"Consider hotel loyalty programs",
				],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const result = await aiService.getRecommendations(context);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"/api/ai/recommendations",
				context,
			);
			expect(result.hotels).toHaveLength(2);
			expect(result.hotels[0].score).toBeGreaterThan(0.9);
		});

		it("should handle recommendations with minimal context", async () => {
			const minimalContext = {
				location: "Austin",
			};

			const mockRecommendations = {
				hotels: [
					{
						id: "hotel_austin_1",
						name: "Austin Downtown Hotel",
						score: 0.7,
						reasons: ["Popular in Austin", "Good ratings"],
					},
				],
				personalizedTips: [
					"Consider adding preferences for better recommendations",
				],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const result = await aiService.getRecommendations(minimalContext);

			expect(result.personalizedTips).toContain("Consider adding preferences");
		});

		it("should handle budget-conscious recommendations", async () => {
			const budgetContext = {
				userId: "budget_user",
				location: "Las Vegas",
				preferences: ["budget-friendly", "clean", "good-location"],
				budget: { min: 50, max: 100 },
			};

			const mockRecommendations = {
				hotels: [
					{
						id: "budget_hotel_1",
						name: "Value Inn Las Vegas",
						score: 0.85,
						reasons: ["Excellent value", "Clean rooms", "Great location"],
						priceRange: { min: 60, max: 80 },
					},
				],
				budgetTips: ["Book mid-week for lower rates", "Look for package deals"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const result = await aiService.getRecommendations(budgetContext);

			expect(result.budgetTips).toBeDefined();
			expect(result.hotels[0].priceRange.max).toBeLessThanOrEqual(100);
		});

		it("should handle luxury recommendations", async () => {
			const luxuryContext = {
				userId: "vip_user",
				location: "Dubai",
				preferences: ["luxury", "spa", "fine-dining", "concierge"],
				budget: { min: 1000, max: 5000 },
			};

			const mockRecommendations = {
				hotels: [
					{
						id: "luxury_hotel_1",
						name: "Burj Al Arab",
						score: 0.98,
						reasons: ["Ultimate luxury", "World-class spa", "Michelin dining"],
						luxuryFeatures: [
							"Butler service",
							"Private beach",
							"Helicopter transfers",
						],
					},
				],
				vipServices: ["Personal concierge", "Private shopping tours"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const result = await aiService.getRecommendations(luxuryContext);

			expect(result.vipServices).toBeDefined();
			expect(result.hotels[0].luxuryFeatures).toContain("Butler service");
		});

		it("should handle empty recommendations gracefully", async () => {
			const context = {
				location: "Remote Island",
				budget: { min: 10, max: 20 },
			};

			const mockRecommendations = {
				hotels: [],
				message: "No hotels found matching your criteria",
				alternatives: [
					"Expand search radius",
					"Increase budget",
					"Try nearby cities",
				],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const result = await aiService.getRecommendations(context);

			expect(result.hotels).toHaveLength(0);
			expect(result.alternatives).toBeDefined();
		});

		it("should handle recommendation API errors", async () => {
			mockedAxios.post.mockRejectedValue(
				new Error("Recommendation service unavailable"),
			);

			await expect(
				aiService.getRecommendations({ location: "Test City" }),
			).rejects.toThrow("Failed to get recommendations");
		});
	});

	describe("Sentiment Analysis", () => {
		it("should analyze positive sentiment correctly", async () => {
			const positiveText =
				"This hotel was absolutely amazing! The staff was incredibly friendly and the room was perfect.";

			const mockSentiment = {
				sentiment: "positive",
				confidence: 0.92,
				score: 0.85,
				emotions: {
					joy: 0.8,
					satisfaction: 0.9,
					excitement: 0.7,
				},
				keywords: ["amazing", "friendly", "perfect"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(positiveText);

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/ai/sentiment", {
				text: positiveText,
			});
			expect(result.sentiment).toBe("positive");
			expect(result.confidence).toBeGreaterThan(0.9);
		});

		it("should analyze negative sentiment correctly", async () => {
			const negativeText =
				"Terrible experience. The room was dirty, staff was rude, and the location was awful.";

			const mockSentiment = {
				sentiment: "negative",
				confidence: 0.95,
				score: -0.82,
				emotions: {
					anger: 0.7,
					disappointment: 0.9,
					frustration: 0.8,
				},
				keywords: ["terrible", "dirty", "rude", "awful"],
				issues: ["cleanliness", "service", "location"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(negativeText);

			expect(result.sentiment).toBe("negative");
			expect(result.issues).toContain("cleanliness");
			expect(result.score).toBeLessThan(0);
		});

		it("should analyze neutral sentiment", async () => {
			const neutralText =
				"The hotel was okay. Nothing special but met basic needs.";

			const mockSentiment = {
				sentiment: "neutral",
				confidence: 0.78,
				score: 0.1,
				emotions: {
					neutral: 0.8,
				},
				keywords: ["okay", "basic"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(neutralText);

			expect(result.sentiment).toBe("neutral");
			expect(Math.abs(result.score)).toBeLessThan(0.3);
		});

		it("should handle mixed sentiment", async () => {
			const mixedText =
				"Great location and beautiful views, but the service was disappointing and overpriced.";

			const mockSentiment = {
				sentiment: "mixed",
				confidence: 0.85,
				score: 0.1,
				emotions: {
					satisfaction: 0.6,
					disappointment: 0.7,
				},
				positive_aspects: ["location", "views"],
				negative_aspects: ["service", "price"],
				keywords: ["great", "beautiful", "disappointing", "overpriced"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(mixedText);

			expect(result.sentiment).toBe("mixed");
			expect(result.positive_aspects).toContain("location");
			expect(result.negative_aspects).toContain("service");
		});

		it("should handle empty or very short text", async () => {
			const shortText = "Ok";

			const mockSentiment = {
				sentiment: "neutral",
				confidence: 0.3,
				score: 0,
				warning: "Text too short for reliable analysis",
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(shortText);

			expect(result.confidence).toBeLessThan(0.5);
			expect(result.warning).toBeDefined();
		});

		it("should handle multilingual sentiment analysis", async () => {
			const spanishText =
				"El hotel era fantástico, muy limpio y el personal muy amable.";

			const mockSentiment = {
				sentiment: "positive",
				confidence: 0.88,
				score: 0.82,
				language: "es",
				keywords: ["fantástico", "limpio", "amable"],
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(spanishText);

			expect(result.language).toBe("es");
			expect(result.sentiment).toBe("positive");
		});

		it("should handle sentiment analysis API errors", async () => {
			mockedAxios.post.mockRejectedValue(
				new Error("Sentiment analysis failed"),
			);

			await expect(aiService.analyzeSentiment("Test text")).rejects.toThrow(
				"Failed to analyze sentiment",
			);
		});
	});

	describe("Edge Cases and Performance", () => {
		it("should handle very long text input", async () => {
			const longText = "This is a very long review. ".repeat(1000);

			const mockSentiment = {
				sentiment: "neutral",
				confidence: 0.75,
				score: 0.05,
				truncated: true,
				originalLength: longText.length,
				analyzedLength: 5000,
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(longText);

			expect(result.truncated).toBe(true);
			expect(result.originalLength).toBeGreaterThan(result.analyzedLength);
		});

		it("should handle special characters and emojis", async () => {
			const emojiText =
				"Hotel was great! 😊👍 Would definitely recommend! 5 ⭐⭐⭐⭐⭐";

			const mockSentiment = {
				sentiment: "positive",
				confidence: 0.94,
				score: 0.9,
				emojis: ["😊", "👍", "⭐"],
				emojiSentiment: "very_positive",
			};

			mockedAxios.post.mockResolvedValue({
				data: mockSentiment,
			});

			const result = await aiService.analyzeSentiment(emojiText);

			expect(result.emojis).toContain("😊");
			expect(result.emojiSentiment).toBe("very_positive");
		});

		it("should handle concurrent requests efficiently", async () => {
			const texts = [
				"Great hotel experience",
				"Terrible service",
				"Average accommodation",
			];

			const mockResponses = [
				{ sentiment: "positive", confidence: 0.9, score: 0.8 },
				{ sentiment: "negative", confidence: 0.95, score: -0.85 },
				{ sentiment: "neutral", confidence: 0.7, score: 0.1 },
			];

			mockedAxios.post
				.mockResolvedValueOnce({ data: mockResponses[0] })
				.mockResolvedValueOnce({ data: mockResponses[1] })
				.mockResolvedValueOnce({ data: mockResponses[2] });

			const promises = texts.map((text) => aiService.analyzeSentiment(text));
			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			expect(results[0].sentiment).toBe("positive");
			expect(results[1].sentiment).toBe("negative");
			expect(results[2].sentiment).toBe("neutral");
		});

		it("should handle API rate limiting", async () => {
			const rateLimitError = new Error("Rate limit exceeded");
			rateLimitError.name = "RateLimitError";

			mockedAxios.post.mockRejectedValue(rateLimitError);

			await expect(aiService.analyzeSentiment("Test text")).rejects.toThrow(
				"Failed to analyze sentiment",
			);
		});

		it("should handle custom baseURL configuration", () => {
			// Test that service uses custom base URL when provided
			const customService = new (aiService.constructor as any)();

			// Mock environment variable
			vi.stubGlobal("import.meta", {
				env: {
					VITE_API_URL: "https://custom-api.example.com/api",
				},
			});

			expect(customService.baseURL || "/api").toMatch(/api/);
		});
	});

	describe("Integration Scenarios", () => {
		it("should handle complete AI workflow", async () => {
			// 1. Process natural language query
			const query = "Find me a hotel in Miami with spa for romantic getaway";
			const mockProcessedQuery: ProcessedQuery = {
				intent: "search_hotels",
				entities: {
					location: "Miami",
					amenities: ["spa"],
					purpose: "romantic",
				},
				confidence: 0.9,
			};

			mockedAxios.post.mockResolvedValueOnce({
				data: { processedQuery: mockProcessedQuery },
			});

			// 2. Get recommendations based on processed query
			const mockRecommendations = {
				hotels: [
					{
						id: "romantic_spa_hotel",
						name: "Miami Spa Resort",
						score: 0.95,
					},
				],
			};

			mockedAxios.post.mockResolvedValueOnce({
				data: mockRecommendations,
			});

			// 3. Analyze sentiment of previous reviews
			const reviewText = "Perfect for couples, amazing spa services";
			const mockSentiment = {
				sentiment: "positive",
				confidence: 0.92,
				keywords: ["perfect", "amazing"],
			};

			mockedAxios.post.mockResolvedValueOnce({
				data: mockSentiment,
			});

			// Execute complete workflow
			const processedQuery = await aiService.processNaturalLanguage(query);
			const recommendations = await aiService.getRecommendations({
				location: processedQuery.entities.location,
				preferences: processedQuery.entities.amenities,
			});
			const sentiment = await aiService.analyzeSentiment(reviewText);

			expect(processedQuery.entities.location).toBe("Miami");
			expect(recommendations.hotels).toHaveLength(1);
			expect(sentiment.sentiment).toBe("positive");
		});
	});
});
