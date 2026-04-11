import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub VITE_API_URL before importing aiService so the baseURL resolves to '/api'
vi.stubEnv("VITE_API_URL", "");

import { aiService } from "@/services/aiService";
import type { ProcessedQuery } from "@/types/api";

// Mock axios
vi.mock("axios", () => ({
	default: {
		post: vi.fn(),
		get: vi.fn(),
		create: vi.fn(() => ({
			post: vi.fn(),
			get: vi.fn(),
		})),
	},
}));

const mockedAxios = axios as any;
mockedAxios.post = vi.fn();
mockedAxios.get = vi.fn();

describe("AIService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("processNaturalLanguage", () => {
		const mockProcessedQuery: ProcessedQuery = {
			intent: "search_hotels",
			originalQuery: "Hotels in Paris for 2 adults",
			extractedDetails: {
				location: "Paris",
				dates: {
					checkIn: "2024-12-01",
					checkOut: "2024-12-03",
				},
				guests: {
					adults: 2,
					children: 0,
					rooms: 1,
				},
				preferences: ["luxury", "spa"],
				budget: {
					min: 200,
					max: 500,
					currency: "USD",
				},
			},
			confidence: 0.9,
		};

		it("should process natural language query successfully", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					processedQuery: mockProcessedQuery,
				},
			});

			const query =
				"Find me a luxury hotel with spa in Paris for 2 adults from December 1st to 3rd";
			const result = await aiService.processNaturalLanguage(query);

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/ai/process-query", {
				query,
				context: {
					timestamp: expect.any(String),
					userAgent: expect.any(String),
				},
			});

			expect(result).toEqual(mockProcessedQuery);
		});

		it("should include correct context information", async () => {
			mockedAxios.post.mockResolvedValue({
				data: {
					processedQuery: mockProcessedQuery,
				},
			});

			// Mock navigator.userAgent
			Object.defineProperty(navigator, "userAgent", {
				value: "Mozilla/5.0 (Test Browser)",
				configurable: true,
			});

			const query = "Hotels in Tokyo";
			await aiService.processNaturalLanguage(query);

			const callArgs = mockedAxios.post.mock.calls[0][1];
			expect(callArgs.context.userAgent).toBe("Mozilla/5.0 (Test Browser)");
			expect(callArgs.context.timestamp).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
			);
		});

		it("should handle API errors gracefully", async () => {
			const apiError = new Error("API request failed");
			mockedAxios.post.mockRejectedValue(apiError);

			await expect(
				aiService.processNaturalLanguage("test query"),
			).rejects.toThrow("Failed to process natural language query");

			expect(console.error).toHaveBeenCalledWith(
				"Error processing natural language query:",
				apiError,
			);
		});

		it("should handle network errors", async () => {
			const networkError = {
				code: "NETWORK_ERROR",
				message: "Network unavailable",
			};
			mockedAxios.post.mockRejectedValue(networkError);

			await expect(
				aiService.processNaturalLanguage("test query"),
			).rejects.toThrow("Failed to process natural language query");

			expect(console.error).toHaveBeenCalledWith(
				"Error processing natural language query:",
				networkError,
			);
		});

		it("should process various query types", async () => {
			const queries = [
				"Romantic getaway in Santorini for honeymoon",
				"Business hotel near airport with meeting rooms",
				"Family resort with kids club and pool",
				"Budget accommodation for backpackers",
				"Pet-friendly hotel that allows dogs",
			];

			for (const query of queries) {
				mockedAxios.post.mockResolvedValue({
					data: {
						processedQuery: {
							...mockProcessedQuery,
							originalQuery: query,
						},
					},
				});

				const result = await aiService.processNaturalLanguage(query);
				expect(result.originalQuery).toBe(query);
			}
		});

		it("should handle empty or invalid queries", async () => {
			const invalidQueries = ["", "   ", "123", "!!!"];

			for (const query of invalidQueries) {
				mockedAxios.post.mockRejectedValue(new Error("Invalid query"));

				await expect(aiService.processNaturalLanguage(query)).rejects.toThrow(
					"Failed to process natural language query",
				);
			}
		});
	});

	describe("getRecommendations", () => {
		const mockRecommendations = {
			hotels: [
				{
					id: "hotel-1",
					name: "AI Recommended Hotel 1",
					score: 0.95,
					reasons: ["Matches budget", "Great location", "High ratings"],
				},
				{
					id: "hotel-2",
					name: "AI Recommended Hotel 2",
					score: 0.88,
					reasons: ["Family-friendly", "Pool available", "Near attractions"],
				},
			],
			confidence: 0.9,
			reasoning: "Based on your preferences and past bookings",
		};

		it("should get recommendations with full context", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const context = {
				userId: "user-123",
				location: "Paris",
				preferences: ["luxury", "spa", "restaurant"],
				budget: { min: 200, max: 500 },
			};

			const result = await aiService.getRecommendations(context);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"/api/ai/recommendations",
				context,
			);
			expect(result).toEqual(mockRecommendations);
		});

		it("should get recommendations with minimal context", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const context = { location: "Tokyo" };
			const result = await aiService.getRecommendations(context);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"/api/ai/recommendations",
				context,
			);
			expect(result).toEqual(mockRecommendations);
		});

		it("should get recommendations with empty context", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const context = {};
			const result = await aiService.getRecommendations(context);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"/api/ai/recommendations",
				context,
			);
			expect(result).toEqual(mockRecommendations);
		});

		it("should handle recommendations API error", async () => {
			const apiError = new Error("Recommendations service unavailable");
			mockedAxios.post.mockRejectedValue(apiError);

			await expect(
				aiService.getRecommendations({ location: "Paris" }),
			).rejects.toThrow("Failed to get recommendations");

			expect(console.error).toHaveBeenCalledWith(
				"Error getting AI recommendations:",
				apiError,
			);
		});

		it("should handle different budget formats", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const budgetFormats = [
				{ min: 0, max: 100 },
				{ min: 100, max: 1000 },
				{ min: 500, max: 999999 },
			];

			for (const budget of budgetFormats) {
				await aiService.getRecommendations({ budget });

				expect(mockedAxios.post).toHaveBeenCalledWith(
					"/api/ai/recommendations",
					{ budget },
				);
			}
		});

		it("should handle various preference types", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockRecommendations,
			});

			const preferenceTypes = [
				["luxury", "spa"],
				["budget", "family-friendly"],
				["business", "airport", "wifi"],
				["romantic", "honeymoon", "private"],
				["adventure", "outdoor", "hiking"],
			];

			for (const preferences of preferenceTypes) {
				await aiService.getRecommendations({ preferences });

				expect(mockedAxios.post).toHaveBeenCalledWith(
					"/api/ai/recommendations",
					{ preferences },
				);
			}
		});
	});

	describe("analyzeSentiment", () => {
		const mockSentimentAnalysis = {
			sentiment: "positive",
			confidence: 0.92,
			score: 0.8,
			emotions: {
				joy: 0.7,
				satisfaction: 0.6,
				excitement: 0.4,
				anger: 0.1,
				sadness: 0.05,
			},
			keywords: ["excellent", "amazing", "wonderful", "great service"],
			summary: "Overall positive sentiment with high satisfaction",
		};

		it("should analyze positive sentiment correctly", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockSentimentAnalysis,
			});

			const text =
				"This hotel was absolutely amazing! Excellent service and wonderful amenities.";
			const result = await aiService.analyzeSentiment(text);

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/ai/sentiment", {
				text,
			});
			expect(result).toEqual(mockSentimentAnalysis);
			expect(result.sentiment).toBe("positive");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should analyze negative sentiment correctly", async () => {
			const negativeSentiment = {
				...mockSentimentAnalysis,
				sentiment: "negative",
				score: -0.7,
				emotions: {
					anger: 0.8,
					disappointment: 0.6,
					frustration: 0.5,
					joy: 0.1,
					satisfaction: 0.1,
				},
				keywords: ["terrible", "awful", "disappointing", "poor service"],
			};

			mockedAxios.post.mockResolvedValue({
				data: negativeSentiment,
			});

			const text = "Terrible experience! Poor service and awful conditions.";
			const result = await aiService.analyzeSentiment(text);

			expect(result.sentiment).toBe("negative");
			expect(result.score).toBeLessThan(0);
		});

		it("should analyze neutral sentiment correctly", async () => {
			const neutralSentiment = {
				...mockSentimentAnalysis,
				sentiment: "neutral",
				score: 0.1,
				emotions: {
					neutral: 0.8,
					joy: 0.2,
					satisfaction: 0.2,
					anger: 0.1,
					sadness: 0.1,
				},
				keywords: ["okay", "average", "standard", "normal"],
			};

			mockedAxios.post.mockResolvedValue({
				data: neutralSentiment,
			});

			const text = "The hotel was okay. Standard rooms and average service.";
			const result = await aiService.analyzeSentiment(text);

			expect(result.sentiment).toBe("neutral");
			expect(Math.abs(result.score)).toBeLessThan(0.3);
		});

		it("should handle sentiment analysis errors", async () => {
			const apiError = new Error("Sentiment analysis failed");
			mockedAxios.post.mockRejectedValue(apiError);

			await expect(aiService.analyzeSentiment("test text")).rejects.toThrow(
				"Failed to analyze sentiment",
			);

			expect(console.error).toHaveBeenCalledWith(
				"Error analyzing sentiment:",
				apiError,
			);
		});

		it("should handle empty or invalid text", async () => {
			const invalidTexts = ["", "   ", "123456", "!!!@@@###"];

			mockedAxios.post.mockRejectedValue(new Error("Invalid text"));

			for (const text of invalidTexts) {
				await expect(aiService.analyzeSentiment(text)).rejects.toThrow(
					"Failed to analyze sentiment",
				);
			}
		});

		it("should handle very long text", async () => {
			mockedAxios.post.mockResolvedValue({
				data: mockSentimentAnalysis,
			});

			const longText = "This is a very long hotel review. ".repeat(500);
			await aiService.analyzeSentiment(longText);

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/ai/sentiment", {
				text: longText,
			});
		});

		it("should handle multilingual text", async () => {
			const multilingualSentiment = {
				...mockSentimentAnalysis,
				language: "es",
				translation: "Excellent hotel with great service",
			};

			mockedAxios.post.mockResolvedValue({
				data: multilingualSentiment,
			});

			const spanishText = "Excelente hotel con gran servicio";
			const result = await aiService.analyzeSentiment(spanishText);

			expect(result.language).toBe("es");
			expect(result.translation).toBeTruthy();
		});
	});

	describe("Service Integration", () => {
		it("should use consistent API base URL across methods", async () => {
			// Include processedQuery so processNaturalLanguage validation passes
			mockedAxios.post.mockResolvedValue({ data: { processedQuery: {}, result: "ok" } });

			await aiService.processNaturalLanguage("test");
			await aiService.getRecommendations({});
			await aiService.analyzeSentiment("test");

			const calls = mockedAxios.post.mock.calls;
			expect(calls[0][0]).toBe("/api/ai/process-query");
			expect(calls[1][0]).toBe("/api/ai/recommendations");
			expect(calls[2][0]).toBe("/api/ai/sentiment");
		});

		it("should handle concurrent requests properly", async () => {
			mockedAxios.post.mockImplementation((url: string) => {
				return new Promise((resolve) => {
					setTimeout(() => {
						// Include processedQuery so processNaturalLanguage validation passes
						resolve({ data: { processedQuery: { intent: "search" }, result: `response for ${url}` } });
					}, Math.random() * 100);
				});
			});

			const promises = [
				aiService.processNaturalLanguage("query 1"),
				aiService.getRecommendations({ location: "Paris" }),
				aiService.analyzeSentiment("sentiment text"),
				aiService.processNaturalLanguage("query 2"),
			];

			const results = await Promise.all(promises);
			expect(results).toHaveLength(4);
			expect(mockedAxios.post).toHaveBeenCalledTimes(4);
		});

		it("should handle request timeouts gracefully", async () => {
			const timeoutError = new Error("Request timeout");
			timeoutError.name = "TimeoutError";
			mockedAxios.post.mockRejectedValue(timeoutError);

			await expect(
				aiService.processNaturalLanguage("test query"),
			).rejects.toThrow("Failed to process natural language query");

			await expect(aiService.getRecommendations({})).rejects.toThrow(
				"Failed to get recommendations",
			);

			await expect(aiService.analyzeSentiment("test text")).rejects.toThrow(
				"Failed to analyze sentiment",
			);
		});

		it("should maintain method isolation on errors", async () => {
			// First method fails
			mockedAxios.post.mockRejectedValueOnce(
				new Error("Query processing failed"),
			);

			// Second method succeeds
			mockedAxios.post.mockResolvedValueOnce({ data: { recommendations: [] } });

			await expect(aiService.processNaturalLanguage("test")).rejects.toThrow(
				"Failed to process natural language query",
			);

			// Second method should still work
			const result = await aiService.getRecommendations({});
			expect(result.recommendations).toEqual([]);
		});
	});

	describe("Edge Cases and Error Resilience", () => {
		it("should handle malformed API responses", async () => {
			mockedAxios.post.mockResolvedValue({
				data: null, // Malformed response
			});

			await expect(aiService.processNaturalLanguage("test")).rejects.toThrow();
		});

		it("should handle missing response data", async () => {
			mockedAxios.post.mockResolvedValue({}); // Missing data property

			await expect(aiService.getRecommendations({})).rejects.toThrow();
		});

		it("should handle network connectivity issues", async () => {
			const networkErrors = [
				new Error("ECONNREFUSED"),
				new Error("ETIMEDOUT"),
				new Error("ENOTFOUND"),
				new Error("EAI_AGAIN"),
			];

			for (const error of networkErrors) {
				mockedAxios.post.mockRejectedValueOnce(error);

				await expect(aiService.analyzeSentiment("test")).rejects.toThrow(
					"Failed to analyze sentiment",
				);
			}
		});

		it("should handle rate limiting", async () => {
			const rateLimitError = new Error("Rate limit exceeded");
			rateLimitError.name = "RateLimitError";
			mockedAxios.post.mockRejectedValue(rateLimitError);

			await expect(aiService.processNaturalLanguage("test")).rejects.toThrow(
				"Failed to process natural language query",
			);

			expect(console.error).toHaveBeenCalledWith(
				"Error processing natural language query:",
				rateLimitError,
			);
		});
	});
});
