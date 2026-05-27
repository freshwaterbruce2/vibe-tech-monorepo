import { invoke } from '@tauri-apps/api/core';

/**
 * Machine Learning Prediction Service
 * Interfaces with Rust prediction_engine.rs for proactive recommendations
 */

export interface Duration {
  seconds: number;
  formatted: string; // e.g., "2h 30m"
}

export interface TimeWindow {
  start_hour: number;
  end_hour: number;
  productivity_score: number;
}

export interface ProductivityInsights {
  peak_hours: TimeWindow[];
  most_productive_day: string;
  average_focus_duration: number;
  task_completion_rate: number;
  recommendations: string[];
}

export interface Recommendation {
  id: number;
  category: 'performance' | 'security' | 'dependency' | 'testing' | 'documentation' | 'predictive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action_label: string;
  action_command: string;
  confidence?: number; // 0.0 to 1.0
  estimated_impact?: string; // e.g., "Saves 20s per build"
  timestamp: number;
  executed: boolean;
  dismissed: boolean;
  metadata?: string | null;
}

export interface PredictionResult {
  estimated_duration: number;
  confidence: number; // 0.0 to 1.0
  variance: number;
  sample_size: number;
}

export interface PredictionAccuracy {
  average_error_percentage: number;
  total_predictions: number;
  successful_predictions: number;
}

function formatDuration(seconds: number): Duration {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return { seconds: safeSeconds, formatted: `${hours}h ${minutes}m` };
  }

  if (hours > 0) {
    return { seconds: safeSeconds, formatted: `${hours}h` };
  }

  if (minutes > 0) {
    return { seconds: safeSeconds, formatted: `${minutes}m` };
  }

  return { seconds: safeSeconds, formatted: `${safeSeconds}s` };
}

/**
 * Predict task completion time based on historical data
 */
export async function predictTaskDuration(taskId: string): Promise<Duration> {
  try {
    const result = await invoke<PredictionResult>('get_task_prediction', {
      taskId,
    });
    if (result.estimated_duration <= 0) {
      return {
        seconds: 1800,
        formatted: '30m',
      };
    }
    return formatDuration(result.estimated_duration);
  } catch (error) {
    console.error('Failed to predict task duration:', error);
    // Fallback to default estimate
    return {
      seconds: 1800, // 30 minutes default
      formatted: '30m',
    };
  }
}

/**
 * Get productivity insights from ML analysis
 */
export async function getProductivityInsights(): Promise<ProductivityInsights> {
  try {
    return await invoke<ProductivityInsights>('get_productivity_insights');
  } catch (error) {
    console.error('Failed to get productivity insights:', error);
    // Return sensible defaults
    return {
      peak_hours: [{ start_hour: 9, end_hour: 12, productivity_score: 0.6 }],
      most_productive_day: 'unknown',
      average_focus_duration: 3600,
      task_completion_rate: 0,
      recommendations: ['Start high-complexity tasks during peak hours'],
    };
  }
}

/**
 * Get proactive recommendations from all guidance rules
 */
export async function getProactiveRecommendations(): Promise<Recommendation[]> {
  try {
    return await invoke<Recommendation[]>('get_proactive_recommendations');
  } catch (error) {
    console.error('Failed to get proactive recommendations:', error);
    return [];
  }
}

/**
 * Execute a recommendation action
 */
export async function executeRecommendation(recommendation: Recommendation): Promise<void> {
  try {
    await invoke('execute_recommendation', {
      recommendationId: recommendation.id,
      command: recommendation.action_command,
    });
  } catch (error) {
    console.error('Failed to execute recommendation:', error);
    throw error;
  }
}

/**
 * Dismiss a recommendation (marks as dismissed in database)
 */
export async function dismissRecommendation(recommendationId: number): Promise<void> {
  try {
    await invoke('dismiss_recommendation', { recommendationId });
  } catch (error) {
    console.error('Failed to dismiss recommendation:', error);
  }
}

/**
 * Get prediction accuracy metrics for monitoring
 */
export async function getPredictionAccuracy(): Promise<PredictionAccuracy> {
  try {
    return await invoke<PredictionAccuracy>('get_prediction_accuracy');
  } catch (error) {
    console.error('Failed to get prediction accuracy:', error);
    return {
      average_error_percentage: 0,
      total_predictions: 0,
      successful_predictions: 0,
    };
  }
}
