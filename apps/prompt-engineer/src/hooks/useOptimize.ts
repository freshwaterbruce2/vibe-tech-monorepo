import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/useToast";
import type { OptimizeRequest } from "@/types";

interface UseOptimizeResult {
	optimizedPrompt: string;
	isOptimizing: boolean;
	error: string | null;
	retryAfter: number;
	optimize: (request: OptimizeRequest) => Promise<string | null>;
}

export function useOptimize(): UseOptimizeResult {
	const [optimizedPrompt, setOptimizedPrompt] = useState("");
	const [isOptimizing, setIsOptimizing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [retryAfter, setRetryAfter] = useState(0);
	const abortControllerRef = useRef<AbortController | null>(null);
	const { toast } = useToast();

	// Countdown timer for rate limiting
	useEffect(() => {
		if (retryAfter <= 0) return;

		const interval = setInterval(() => {
			setRetryAfter((prev) => {
				if (prev <= 1) {
					toast({
						title: "Ready",
						description: "You can now optimize prompts again.",
					});
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [retryAfter, toast]);

	const optimize = useCallback(
		async (request: OptimizeRequest): Promise<string | null> => {
			// Cancel any pending request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			// Check if rate limited
			if (retryAfter > 0) {
				toast({
					title: "Rate Limited",
					description: `Please wait ${retryAfter} seconds before trying again.`,
					variant: "destructive",
				});
				return null;
			}

			abortControllerRef.current = new AbortController();
			setIsOptimizing(true);
			setError(null);
			setOptimizedPrompt("");

			try {
				const response = await fetch("/api/optimize", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(request),
					signal: abortControllerRef.current.signal,
				});

				// Handle rate limiting with Retry-After header
				if (response.status === 429) {
					const retryAfterHeader = response.headers.get("Retry-After");
					const seconds = retryAfterHeader
						? parseInt(retryAfterHeader, 10)
						: 60;
					setRetryAfter(seconds);
					toast({
						title: "Rate Limit Exceeded",
						description: `Try again in ${seconds} seconds.`,
						variant: "destructive",
					});
					setIsOptimizing(false);
					return null;
				}

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error ?? `HTTP ${response.status}`);
				}

				// Handle streaming response
				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error("No response body");
				}

				const decoder = new TextDecoder();
				let result = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split("\n");

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const data = line.slice(6);
							if (data === "[DONE]") continue;

							try {
								const parsed = JSON.parse(data);
								const content = parsed.choices?.[0]?.delta?.content ?? "";
								result += content;
								setOptimizedPrompt(result);
							} catch {
								// Ignore parse errors for incomplete chunks
							}
						}
					}
				}

				setIsOptimizing(false);
				return result;
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return null;
				}

				const message = err instanceof Error ? err.message : "Unknown error";
				setError(message);
				setIsOptimizing(false);
				toast({
					title: "Error",
					description: message,
					variant: "destructive",
				});
				return null;
			}
		},
		[retryAfter, toast],
	);

	return {
		optimizedPrompt,
		isOptimizing,
		error,
		retryAfter,
		optimize,
	};
}
