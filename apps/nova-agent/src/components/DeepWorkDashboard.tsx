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

export function DeepWorkDashboard() {
	const { stats, sessions, isLoading, error, refetch } = useDeepWorkData();

	// Transform sessions into chart data
	const chartData = useMemo<ChartDataPoint[]>(() => {
		if (!sessions || sessions.length === 0) return [];

		return sessions
			.filter((s) => s.duration_minutes && s.duration_minutes > 0)
			.map((session) => ({
				date: format(new Date(session.start_timestamp * 1000), "MMM dd HH:mm"),
				duration: session.duration_minutes || 0,
				quality: Math.round(session.quality_score),
			}))
			.slice(-10); // Last 10 sessions
	}, [sessions]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-4"></div>
					<p className="text-cyan-400 text-lg">
						Loading deep work analytics...
					</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 p-8">
				<div className="max-w-md w-full bg-red-900/20 border-2 border-red-500 rounded-xl p-6 backdrop-blur-sm">
					<div className="flex items-center mb-4">
						<svg
							className="w-8 h-8 text-red-400 mr-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3 className="text-xl font-bold text-red-400">
							Error Loading Data
						</h3>
					</div>
					<p className="text-red-300 mb-4">{error}</p>
					<button
						onClick={async () => refetch()}
						className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	// No data state
	if (!stats) {
		return (
			<div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
				<div className="text-center max-w-md">
					<svg
						className="w-24 h-24 text-purple-400 mx-auto mb-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
					<h3 className="text-2xl font-bold text-purple-400 mb-4">
						No Deep Work Data Yet
					</h3>
					<p className="text-gray-400 mb-6">
						Start working on focused tasks and NOVA will automatically track
						your deep work sessions.
					</p>
					<button
						onClick={async () => refetch()}
						className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
					>
						Check Again
					</button>
				</div>
			</div>
		);
	}

	// Calculate additional metrics
	const hoursThisWeek = (stats.total_minutes / 60).toFixed(1);
	const weeklyGoalHours = 10;
	const progressPercentage = Math.min(stats.weekly_goal_progress, 100);
	const averageQuality =
		sessions.length > 0
			? Math.round(
					sessions.reduce((sum, s) => sum + s.quality_score, 0) /
						sessions.length,
				)
			: 0;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
						Deep Work Dashboard
					</h1>
					<p className="text-gray-400">
						Track your focused work sessions and productivity
					</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{/* Total Hours Card */}
					<div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 shadow-xl">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-cyan-300 text-sm font-semibold uppercase tracking-wide">
								This Week
							</h3>
							<svg
								className="w-8 h-8 text-cyan-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div className="text-4xl font-bold text-white mb-1">
							{hoursThisWeek}h
						</div>
						<p className="text-cyan-200 text-sm">of {weeklyGoalHours}h goal</p>
					</div>

					{/* Sessions Card */}
					<div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-xl">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-blue-300 text-sm font-semibold uppercase tracking-wide">
								Sessions
							</h3>
							<svg
								className="w-8 h-8 text-blue-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
						</div>
						<div className="text-4xl font-bold text-white mb-1">
							{stats.total_sessions}
						</div>
						<p className="text-blue-200 text-sm">
							{(stats.average_duration / 60).toFixed(1)}h avg
						</p>
					</div>

					{/* Quality Score Card */}
					<div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-xl">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-purple-300 text-sm font-semibold uppercase tracking-wide">
								Quality
							</h3>
							<svg
								className="w-8 h-8 text-purple-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
								/>
							</svg>
						</div>
						<div className="text-4xl font-bold text-white mb-1">
							{averageQuality}
						</div>
						<p className="text-purple-200 text-sm">Focus score</p>
					</div>

					{/* Longest Session Card */}
					<div className="bg-gradient-to-br from-pink-900/40 to-pink-800/40 backdrop-blur-sm border border-pink-500/30 rounded-xl p-6 shadow-xl">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-pink-300 text-sm font-semibold uppercase tracking-wide">
								Best Session
							</h3>
							<svg
								className="w-8 h-8 text-pink-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<div className="text-4xl font-bold text-white mb-1">
							{(stats.longest_session / 60).toFixed(1)}h
						</div>
						<p className="text-pink-200 text-sm">Longest streak</p>
					</div>
				</div>

				{/* Weekly Goal Progress */}
				<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8 shadow-xl">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-bold text-white">
							Weekly Goal Progress
						</h2>
						<span className="text-cyan-400 font-bold text-lg">
							{progressPercentage.toFixed(0)}%
						</span>
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
					{/* Session Duration Chart */}
					<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
						<h2 className="text-2xl font-bold text-white mb-6">
							Session Duration Trend
						</h2>
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
									<XAxis
										dataKey="date"
										stroke="#9CA3AF"
										tick={{ fill: "#9CA3AF", fontSize: 12 }}
										angle={-45}
										textAnchor="end"
										height={80}
									/>
									<YAxis
										stroke="#9CA3AF"
										tick={{ fill: "#9CA3AF" }}
										label={{
											value: "Minutes",
											angle: -90,
											position: "insideLeft",
											fill: "#9CA3AF",
										}}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#1F2937",
											border: "1px solid #374151",
											borderRadius: "8px",
											color: "#F3F4F6",
										}}
									/>
									<Legend wrapperStyle={{ color: "#9CA3AF" }} />
									<Line
										type="monotone"
										dataKey="duration"
										stroke="#06B6D4"
										strokeWidth={3}
										dot={{ fill: "#06B6D4", strokeWidth: 2, r: 5 }}
										activeDot={{ r: 8 }}
										name="Duration (min)"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[300px] flex items-center justify-center text-gray-400">
								<p>No session data available yet</p>
							</div>
						)}
					</div>

					{/* Quality Score Chart */}
					<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
						<h2 className="text-2xl font-bold text-white mb-6">
							Focus Quality Scores
						</h2>
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
									<XAxis
										dataKey="date"
										stroke="#9CA3AF"
										tick={{ fill: "#9CA3AF", fontSize: 12 }}
										angle={-45}
										textAnchor="end"
										height={80}
									/>
									<YAxis
										stroke="#9CA3AF"
										tick={{ fill: "#9CA3AF" }}
										label={{
											value: "Score",
											angle: -90,
											position: "insideLeft",
											fill: "#9CA3AF",
										}}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#1F2937",
											border: "1px solid #374151",
											borderRadius: "8px",
											color: "#F3F4F6",
										}}
									/>
									<Legend wrapperStyle={{ color: "#9CA3AF" }} />
									<Bar
										dataKey="quality"
										fill="#A855F7"
										radius={[8, 8, 0, 0]}
										name="Quality Score"
									/>
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
						<h2 className="text-2xl font-bold text-white mb-6">
							Recent Sessions
						</h2>
						<div className="space-y-3">
							{sessions.slice(0, 5).map((session) => (
								<div
									key={session.id || session.start_timestamp}
									className="flex items-center justify-between bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
								>
									<div className="flex items-center space-x-4">
										<div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
											<span className="text-white font-bold text-lg">
												{Math.round((session.duration_minutes || 0) / 60) ||
													"<1"}
												h
											</span>
										</div>
										<div>
											<p className="text-white font-semibold">
												{session.primary_app}
											</p>
											<p className="text-gray-400 text-sm">
												{format(
													new Date(session.start_timestamp * 1000),
													'MMM dd, yyyy " HH:mm',
												)}
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-6">
										<div className="text-right">
											<p className="text-gray-400 text-sm">Quality</p>
											<p className="text-purple-400 font-bold">
												{Math.round(session.quality_score)}
											</p>
										</div>
										<div className="text-right">
											<p className="text-gray-400 text-sm">Switches</p>
											<p className="text-yellow-400 font-bold">
												{session.switch_count}
											</p>
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
