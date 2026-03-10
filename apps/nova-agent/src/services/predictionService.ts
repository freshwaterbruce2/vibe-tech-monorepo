import { invoke } from "@tauri-apps/api/core";

/**
 * Machine Learning Prediction Service
 * Interfaces with Rust prediction_engine.rs for proactive recommendations
 */

export interface Duration {
	seconds: number;
	formatted: string; // e.g., "2h 30m"
}

export interface ProductivityInsights {
	peak_hours: number[]; // Hours of day (0-23)
	optimal_task_types: string[];
	average_focus_duration: Duration;
	context_switch_frequency: number;
	recommendations: string[];
}

export interface Recommendation {
	id: string;
	category:
		| "performance"
		| "security"
		| "dependency"
		| "testing"
		| "documentation"
		| "predictive";
	priority: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	action_label: string;
	action_command: string;
	confidence?: number; // 0.0 to 1.0
	estimated_impact?: string; // e.g., "Saves 20s per build"
	created_at: number;
}

export interface PredictionResult {
	estimated_duration: Duration;
	confidence: number; // 0.0 to 1.0
	variance: number;
}

/**
 * Predict task completion time based on historical data
 */
export async function predictTaskDuration(taskId: string): Promise<Duration> {
	try {
		const result = await invoke<PredictionResult>("predict_task_duration", {
			taskId,
		});
		return result.estimated_duration;
	} catch (error) {
		console.error("Failed to predict task duration:", error);
		// Fallback to default estimate
		return {
			seconds: 1800, // 30 minutes default
			formatted: "30m",
		};
	}
}

/**
 * Get productivity insights from ML analysis
 */
export async function getProductivityInsights(): Promise<ProductivityInsights> {
	try {
		return await invoke<ProductivityInsights>("get_productivity_insights");
	} catch (error) {
		console.error("Failed to get productivity insights:", error);
		// Return sensible defaults
		return {
			peak_hours: [9, 10, 11], // Default morning peak
			optimal_task_types: ["coding", "documentation"],
			average_focus_duration: { seconds: 3600, formatted: "1h" },
			context_switch_frequency: 5,
			recommendations: ["Start high-complexity tasks during peak hours"],
		};
	}
}

/**
 * Get proactive recommendations from all guidance rules
 */
export async function getProactiveRecommendations(): Promise<Recommendation[]> {
	try {
		return await invoke<Recommendation[]>("get_proactive_recommendations");
	} catch (error) {
		console.error("Failed to get proactive recommendations:", error);
		return [];
	}
}

/**
 * Execute a recommendation action
 */
export async function executeRecommendation(
	recommendation: Recommendation,
): Promise<void> {
	try {
		await invoke("execute_recommendation", {
			recommendationId: recommendation.id,
			command: recommendation.action_command,
		});
	} catch (error) {
		console.error("Failed to execute recommendation:", error);
		throw error;
	}
}

/**
 * Dismiss a recommendation (marks as dismissed in database)
 */
export async function dismissRecommendation(
	recommendationId: string,
): Promise<void> {
	try {
		await invoke("dismiss_recommendation", { recommendationId });
	} catch (error) {
		console.error("Failed to dismiss recommendation:", error);
	}
}

/**
 * Get prediction accuracy metrics for monitoring
 */
export async function getPredictionAccuracy(): Promise<{
	average_error_percentage: number;
	total_predictions: number;
	successful_predictions: number;
}> {
	try {
		return await invoke("get_prediction_accuracy");
	} catch (error) {
		console.error("Failed to get prediction accuracy:", error);
		return {
			average_error_percentage: 0,
			total_predictions: 0,
			successful_predictions: 0,
		};
	}
}
