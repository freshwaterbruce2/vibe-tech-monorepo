import axios from 'axios';
import type { ProcessedQuery } from '@/types/api';

class AIService {
	private baseURL = import.meta.env.VITE_API_URL || '/api';

	async processNaturalLanguage(query: string): Promise<ProcessedQuery> {
		try {
			const response = await axios.post(`${this.baseURL}/ai/process-query`, {
				query,
				context: {
					timestamp: new Date().toISOString(),
					userAgent: navigator.userAgent,
				},
			});
			if (!response.data || !response.data.processedQuery) {
				throw new Error('Invalid API response: no data received');
			}
			return response.data.processedQuery;
		} catch (error) {
			console.error('Error processing natural language query:', error);
			throw new Error('Failed to process natural language query');
		}
	}

	async getRecommendations(context: {
		userId?: string;
		location?: string;
		preferences?: string[];
		budget?: { min: number; max: number };
	}) {
		try {
			const response = await axios.post(
				`${this.baseURL}/ai/recommendations`,
				context,
			);
			if (response.data === undefined || response.data === null) {
				throw new Error('Invalid API response: no data received');
			}
			return response.data;
		} catch (error) {
			console.error('Error getting AI recommendations:', error);
			throw new Error('Failed to get recommendations');
		}
	}

	async analyzeSentiment(text: string) {
		try {
			const response = await axios.post(`${this.baseURL}/ai/sentiment`, {
				text,
			});
			return response.data;
		} catch (error) {
			console.error('Error analyzing sentiment:', error);
			throw new Error('Failed to analyze sentiment');
		}
	}
}

export const aiService = new AIService();
