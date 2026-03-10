import { useCallback, useRef, useState } from "react";

interface RateLimitOptions {
	windowMs: number;
	maxCalls: number;
}

export const useRateLimit = (options: RateLimitOptions) => {
	const timestampsRef = useRef<number[]>([]);
	const [remaining, setRemaining] = useState(options.maxCalls);

	const prune = useCallback(() => {
		const now = Date.now();
		const next = timestampsRef.current.filter(
			(t) => now - t < options.windowMs,
		);
		timestampsRef.current = next;
		setRemaining(Math.max(0, options.maxCalls - next.length));
		return next;
	}, [options.maxCalls, options.windowMs]);

	const tryAcquire = useCallback(() => {
		const next = prune();
		if (next.length >= options.maxCalls) return false;
		timestampsRef.current = [...next, Date.now()];
		setRemaining(Math.max(0, options.maxCalls - timestampsRef.current.length));
		return true;
	}, [options.maxCalls, prune]);

	return { remaining, tryAcquire };
};
