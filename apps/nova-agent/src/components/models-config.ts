export interface Model {
	id: string;
	name: string;
	provider: string;
	inputCost: number; // $ per 1M tokens
	outputCost: number; // $ per 1M tokens
	contextWindow: string;
	speed: "fast" | "medium" | "slow";
	quality: 1 | 2 | 3 | 4 | 5;
	bestFor: string;
	tier: "free" | "low" | "medium" | "high";
	recommended?: boolean;
}

export type TierKey = "free" | "low" | "medium" | "high";
export type SortKey = "cost" | "quality" | "speed" | "tier";

export interface TierBadge {
	label: string;
	color: string;
}

// Updated January 12, 2026 - Latest OpenRouter models organized by cost tier
export const MODELS_2026: Model[] = [
	// ============================================
	// FREE TIER - $0 per 1M tokens
	// ============================================
	{
		id: "xiaomi/mimo-v2-flash:free",
		name: "MiMo V2 Flash",
		provider: "Xiaomi",
		inputCost: 0,
		outputCost: 0,
		contextWindow: "128K",
		speed: "fast",
		quality: 4,
		bestFor: "Best free model - Fast & capable",
		tier: "free",
		recommended: true,
	},
	{
		id: "mistralai/devstral-2512:free",
		name: "Devstral 2512",
		provider: "Mistral",
		inputCost: 0,
		outputCost: 0,
		contextWindow: "256K",
		speed: "fast",
		quality: 4,
		bestFor: "Free code specialist - Huge context",
		tier: "free",
	},
	{
		id: "meta-llama/llama-3.3-70b-instruct:free",
		name: "Llama 3.3 70B",
		provider: "Meta",
		inputCost: 0,
		outputCost: 0,
		contextWindow: "128K",
		speed: "medium",
		quality: 4,
		bestFor: "Free open-source powerhouse",
		tier: "free",
	},
	{
		id: "google/gemini-2.0-flash:free",
		name: "Gemini 2.0 Flash",
		provider: "Google",
		inputCost: 0,
		outputCost: 0,
		contextWindow: "1M",
		speed: "fast",
		quality: 4,
		bestFor: "Free with massive 1M context",
		tier: "free",
	},

	// ============================================
	// LOW COST TIER - Under $1 per 1M tokens
	// ============================================
	{
		id: "deepseek/deepseek-v3.2",
		name: "DeepSeek V3.2",
		provider: "DeepSeek",
		inputCost: 0.27,
		outputCost: 1.1,
		contextWindow: "128K",
		speed: "fast",
		quality: 5,
		bestFor: "Best for coding - 95% cheaper than GPT-4 (Jan 2026)",
		tier: "low",
		recommended: true,
	},
	{
		id: "deepseek/deepseek-chat",
		name: "DeepSeek V3",
		provider: "DeepSeek",
		inputCost: 0.27,
		outputCost: 1.1,
		contextWindow: "128K",
		speed: "fast",
		quality: 5,
		bestFor: "Legacy - Use V3.2 instead",
		tier: "low",
		recommended: false,
	},
	{
		id: "google/gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		provider: "Google",
		inputCost: 0.3,
		outputCost: 1.2,
		contextWindow: "1M",
		speed: "fast",
		quality: 4,
		bestFor: "Cheap with 1M context window",
		tier: "low",
	},
	{
		id: "openai/gpt-5-mini",
		name: "GPT-5 Mini",
		provider: "OpenAI",
		inputCost: 0.25,
		outputCost: 2.0,
		contextWindow: "272K",
		speed: "fast",
		quality: 4,
		bestFor: "Fast & affordable GPT-5 variant",
		tier: "low",
	},
	{
		id: "anthropic/claude-haiku-3.5",
		name: "Claude Haiku 3.5",
		provider: "Anthropic",
		inputCost: 0.8,
		outputCost: 4.0,
		contextWindow: "200K",
		speed: "fast",
		quality: 4,
		bestFor: "Fastest Claude - Low latency",
		tier: "low",
	},

	// ============================================
	// MEDIUM COST TIER - $1-$5 per 1M tokens
	// ============================================
	{
		id: "openai/gpt-5",
		name: "GPT-5",
		provider: "OpenAI",
		inputCost: 1.25,
		outputCost: 10.0,
		contextWindow: "272K",
		speed: "medium",
		quality: 5,
		bestFor: "Latest GPT flagship - Excellent reasoning",
		tier: "medium",
		recommended: true,
	},
	{
		id: "google/gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		provider: "Google",
		inputCost: 1.25,
		outputCost: 10.0,
		contextWindow: "2M",
		speed: "medium",
		quality: 5,
		bestFor: "Huge 2M context - Long documents",
		tier: "medium",
	},
	{
		id: "anthropic/claude-sonnet-4.5",
		name: "Claude Sonnet 4.5",
		provider: "Anthropic",
		inputCost: 3.0,
		outputCost: 15.0,
		contextWindow: "200K",
		speed: "medium",
		quality: 5,
		bestFor: "Best for coding - Superior quality",
		tier: "medium",
	},
	{
		id: "x-ai/grok-code-fast-1",
		name: "Grok Code Fast 1",
		provider: "xAI",
		inputCost: 2.0,
		outputCost: 10.0,
		contextWindow: "128K",
		speed: "fast",
		quality: 5,
		bestFor: "Code specialist - Fast generation",
		tier: "medium",
	},

	// ============================================
	// HIGH COST TIER - Over $5 per 1M tokens
	// ============================================
	{
		id: "openai/gpt-5.2-pro",
		name: "GPT-5.2 Pro",
		provider: "OpenAI",
		inputCost: 10.0,
		outputCost: 30.0,
		contextWindow: "272K",
		speed: "slow",
		quality: 5,
		bestFor: "Maximum intelligence - Complex reasoning",
		tier: "high",
		recommended: true,
	},
	{
		id: "anthropic/claude-opus-4.5",
		name: "Claude Opus 4.5",
		provider: "Anthropic",
		inputCost: 15.0,
		outputCost: 75.0,
		contextWindow: "200K",
		speed: "slow",
		quality: 5,
		bestFor: "Highest quality - Creative writing",
		tier: "high",
	},
	{
		id: "openai/gpt-5.1-codex-max",
		name: "GPT-5.1 Codex Max",
		provider: "OpenAI",
		inputCost: 5.0,
		outputCost: 15.0,
		contextWindow: "512K",
		speed: "medium",
		quality: 5,
		bestFor: "Massive context for code - 512K window",
		tier: "high",
	},
	{
		id: "google/gemini-3-pro-preview",
		name: "Gemini 3 Pro Preview",
		provider: "Google",
		inputCost: 7.5,
		outputCost: 30.0,
		contextWindow: "2M",
		speed: "slow",
		quality: 5,
		bestFor: "Experimental - Cutting edge",
		tier: "high",
	},
];

const TIER_BADGES: Record<TierKey, TierBadge> = {
	free: {
		label: "FREE",
		color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
	},
	low: {
		label: "LOW COST",
		color: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
	},
	medium: {
		label: "MEDIUM",
		color: "bg-pink-500/10 text-pink-400 border border-pink-500/30",
	},
	high: {
		label: "HIGH COST",
		color: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
	},
};

const TIER_ORDER: Record<TierKey, number> = { free: 0, low: 1, medium: 2, high: 3 };
const SPEED_ORDER: Record<Model["speed"], number> = { fast: 0, medium: 1, slow: 2 };

export function getTierBadge(tier: TierKey): TierBadge {
	return TIER_BADGES[tier];
}

export function calculateCost(
	model: Model,
	inputTokens: number,
	outputTokens: number,
): string {
	if (model.inputCost === 0 && model.outputCost === 0) return "FREE";
	const inputCost = (inputTokens / 1_000_000) * model.inputCost;
	const outputCost = (outputTokens / 1_000_000) * model.outputCost;
	return `$${(inputCost + outputCost).toFixed(2)}`;
}

export function sortModels(models: Model[], sortBy: SortKey): Model[] {
	return [...models].sort((a, b) => {
		if (sortBy === "cost") {
			return a.inputCost + a.outputCost - (b.inputCost + b.outputCost);
		}
		if (sortBy === "quality") return b.quality - a.quality;
		if (sortBy === "speed") return SPEED_ORDER[a.speed] - SPEED_ORDER[b.speed];
		return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
	});
}

export function filterByTier(
	models: Model[],
	tier: "all" | TierKey,
): Model[] {
	return tier === "all" ? models : models.filter((m) => m.tier === tier);
}
