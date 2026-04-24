interface DeepWorkLoadingProps {
	message?: string;
}

export function DeepWorkLoading({ message = "Loading deep work analytics..." }: DeepWorkLoadingProps) {
	return (
		<div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
			<div className="text-center">
				<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-4"></div>
				<p className="text-cyan-400 text-lg">{message}</p>
			</div>
		</div>
	);
}

interface DeepWorkErrorProps {
	error: string;
	onRetry: () => void;
}

export function DeepWorkError({ error, onRetry }: DeepWorkErrorProps) {
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
					onClick={onRetry}
					className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		</div>
	);
}

export function DeepWorkEmpty({ onRetry }: { onRetry: () => void }) {
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
					onClick={onRetry}
					className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
				>
					Check Again
				</button>
			</div>
		</div>
	);
}
