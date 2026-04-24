import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex min-h-screen items-center justify-center bg-bg-dark p-4">
					<div className="w-full max-w-md rounded-lg border border-red-500/30 bg-bg-card p-8 text-center">
						<div className="mb-4 text-6xl">⚠️</div>
						<h2 className="mb-2 text-2xl font-bold text-red-400">
							Something went wrong
						</h2>
						<p className="mb-4 text-text-secondary">
							An unexpected error occurred. Please refresh the page to try
							again.
						</p>
						{this.state.error && (
							<details className="mb-4 text-left">
								<summary className="cursor-pointer text-sm text-text-muted hover:text-text-secondary">
									Error details
								</summary>
								<pre className="mt-2 overflow-auto rounded bg-bg-elevated p-2 text-xs text-red-400">
									{this.state.error.toString()}
								</pre>
							</details>
						)}
						<button
							onClick={() => window.location.reload()}
							className="rounded-lg bg-blue-primary px-6 py-2 font-medium text-white transition-colors hover:bg-blue-primary/80"
						>
							Refresh Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
