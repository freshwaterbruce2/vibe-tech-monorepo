export interface DeepWorkSession {
	id: string;
	start_timestamp: number;
	end_timestamp?: number;
	duration_minutes: number;
	quality_score: number;
	primary_app: string;
	switch_count: number;
}

export interface DeepWorkStats {
	total_minutes: number;
	total_sessions: number;
	average_duration: number;
	longest_session: number;
	weekly_goal_progress: number;
}

export interface ChartDataPoint {
	date: string;
	duration: number;
	quality: number;
}
