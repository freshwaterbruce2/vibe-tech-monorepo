interface StatsCardsProps {
	hoursThisWeek: string;
	weeklyGoalHours: number;
	totalSessions: number;
	averageDuration: number;
	averageQuality: number;
	longestSession: number;
}

export function DeepWorkStatsCards({
	hoursThisWeek,
	weeklyGoalHours,
	totalSessions,
	averageDuration,
	averageQuality,
	longestSession,
}: StatsCardsProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			{/* Total Hours Card */}
			<div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 shadow-xl">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-cyan-300 text-sm font-semibold uppercase tracking-wide">
						This Week
					</h3>
					<svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div className="text-4xl font-bold text-white mb-1">{hoursThisWeek}h</div>
				<p className="text-cyan-200 text-sm">of {weeklyGoalHours}h goal</p>
			</div>

			{/* Sessions Card */}
			<div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-xl">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-blue-300 text-sm font-semibold uppercase tracking-wide">
						Sessions
					</h3>
					<svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
				</div>
				<div className="text-4xl font-bold text-white mb-1">{totalSessions}</div>
				<p className="text-blue-200 text-sm">{(averageDuration / 60).toFixed(1)}h avg</p>
			</div>

			{/* Quality Score Card */}
			<div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-xl">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-purple-300 text-sm font-semibold uppercase tracking-wide">
						Quality
					</h3>
					<svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
					</svg>
				</div>
				<div className="text-4xl font-bold text-white mb-1">{averageQuality}</div>
				<p className="text-purple-200 text-sm">Focus score</p>
			</div>

			{/* Longest Session Card */}
			<div className="bg-gradient-to-br from-pink-900/40 to-pink-800/40 backdrop-blur-sm border border-pink-500/30 rounded-xl p-6 shadow-xl">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-pink-300 text-sm font-semibold uppercase tracking-wide">
						Best Session
					</h3>
					<svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<div className="text-4xl font-bold text-white mb-1">{(longestSession / 60).toFixed(1)}h</div>
				<p className="text-pink-200 text-sm">Longest streak</p>
			</div>
		</div>
	);
}
