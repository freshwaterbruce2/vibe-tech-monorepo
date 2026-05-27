import { useCallback } from "react";

export const usePerformanceMonitor = () => {
	const measure = useCallback(
		async <T>(name: string, fn: () => Promise<T> | T) => {
			const start = performance.now();
			try {
				return await fn();
			} finally {
				const durationMs = performance.now() - start;
				if (import.meta.env.DEV) {
					console.log(`[Perf] ${name}: ${durationMs.toFixed(1)}ms`);
				}
			}
		},
		[],
	);

	return { measure };
};
