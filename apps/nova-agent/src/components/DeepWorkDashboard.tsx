import { format } from "date-fns";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useDeepWorkData } from "../hooks/useDeepWorkData";
import type { ChartDataPoint } from "../types/deepWork";
import { DeepWorkLoading, DeepWorkError, DeepWorkEmpty } from "./deepwork/DeepWorkStates";
import { DeepWorkStatsCards } from "./deepwork/DeepWorkStatsCards";

export function DeepWorkDashboard() {
	const { stats, sessions, isLoading, error, refetch } = useDeepWorkData();

	const chartData = useMemo<ChartDataPoint[]>(() => {
		if (!sessions || sessions.length === 0) return [];
		return sessions
			.filter((s) => s.duration_minutes && s.duration_minutes > 0)
			.map((session) => ({
				date: format(new Date(session.start_timestamp * 1000), "MMM dd HH:mm"),
				duration: session.duration_minutes || 0,
				quality: Math.round(session.quality_score),
			}))
			.slice(-10);
	}, [sessions]);

	if (isLoading) return <DeepWorkLoading />;
	if (error) return <DeepWorkError error={error} onRetry={() => { void refetch(); }} />;
	if (!stats) return <DeepWorkEmpty onRetry={() => { void refetch(); }} />;

	const hoursThisWeek = (stats.total_minutes / 60).toFixed(1);
	const weeklyGoalHours = 10;
	const progressPercentage = Math.min(stats.weekly_goal_progress, 100);
	const averageQuality =
		sessions.length > 0
			? Math.round(sessions.reduce((sum, s) => sum + s.quality_score, 0) / sessions.length)
			: 0;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
			<div className="max-w-7xl mx-auto">
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
						Deep Work Dashboard
					</h1>
					<p className="text-gray-400">Track your focused work sessions and productivity</p>
				</div>

				<DeepWorkStatsCards
					hoursThisWeek={hoursThisWeek}
					weeklyGoalHours={weeklyGoalHours}
					totalSessions={stats.total_sessions}
					averageDuration={stats.average_duration}
					averageQuality={averageQuality}
					longestSession={stats.longest_session}
				/>

				{/* Weekly Goal Progress */}
				<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8 shadow-xl">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-bold text-white">Weekly Goal Progress</h2>
						<span className="text-cyan-400 font-bold text-lg">{progressPercentage.toFixed(0)}%</span>
					</div>
					<div className="relative w-full h-8 bg-gray-700 rounded-full overflow-hidden">
						<div
							className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out rounded-full"
							style={{ width: `${progressPercentage}%` }}
						>
							<div className="absolute inset-0 bg-white/20 animate-pulse"></div>
						</div>
					</div>
					<div className="flex justify-between mt-2 text-sm text-gray-400">
						<span>0h</span>
						<span>{weeklyGoalHours}h goal</span>
					</div>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
						<h2 className="text-2xl font-bold text-white mb-6">Session Duration Trend</h2>
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
									<XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
									<YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} label={{ value: "Minutes", angle: -90, position: "insideLeft", fill: "#9CA3AF" }} />
									<Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px", color: "#F3F4F6" }} />
									<Legend wrapperStyle={{ color: "#9CA3AF" }} />
									<Line type="monotone" dataKey="duration" stroke="#06B6D4" strokeWidth={3} dot={{ fill: "#06B6D4", strokeWidth: 2, r: 5 }} activeDot={{ r: 8 }} name="Duration (min)" />
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[300px] flex items-center justify-center text-gray-400">
								<p>No session data available yet</p>
							</div>
						)}
					</div>

					<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
						<h2 className="text-2xl font-bold text-white mb-6">Focus Quality Scores</h2>
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
									<XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
									<YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} label={{ value: "Score", angle: -90, position: "insideLeft", fill: "#9CA3AF" }} />
									<Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px", color: "#F3F4F6" }} />
									<Legend wrapperStyle={{ color: "#9CA3AF" }} />
									<Bar dataKey="quality" fill="#A855F7" radius={[8, 8, 0, 0]} name="Quality Score" />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[300px] flex items-center justify-center text-gray-400">
								<p>No quality data available yet</p>
							</div>
						)}
					</div>
				</div>

				{/* Recent Sessions List */}
				{sessions.length > 0 && (
					<div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
						<h2 className="text-2xl font-bold text-white mb-6">Recent Sessions</h2>
						<div className="space-y-3">
							{sessions.slice(0, 5).map((session) => (
								<div
									key={session.id || session.start_timestamp}
									className="flex items-center justify-between bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
								>
									<div className="flex items-center space-x-4">
										<div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
											<span className="text-white font-bold text-lg">
												{Math.round((session.duration_minutes || 0) / 60) || "<1"}h
											</span>
										</div>
										<div>
											<p className="text-white font-semibold">{session.primary_app}</p>
											<p className="text-gray-400 text-sm">
												{format(new Date(session.start_timestamp * 1000), 'MMM dd, yyyy " HH:mm')}
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-6">
										<div className="text-right">
											<p className="text-gray-400 text-sm">Quality</p>
											<p className="text-purple-400 font-bold">{Math.round(session.quality_score)}</p>
										</div>
										<div className="text-right">
											<p className="text-gray-400 text-sm">Switches</p>
											<p className="text-yellow-400 font-bold">{session.switch_count}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
