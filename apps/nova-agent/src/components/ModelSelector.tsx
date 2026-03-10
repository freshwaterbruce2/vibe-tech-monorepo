import { Brain, Check, Clock, DollarSign, Sparkles, Zap } from "lucide-react";
import React, { useState } from "react";

interface Model {
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

// Updated January 12, 2026 - Latest OpenRouter models organized by cost tier
const MODELS_2026: Model[] = [
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

interface ModelSelectorProps {
	selectedModel: string;
	onSelectModel: (modelId: string) => void;
}

export default function ModelSelector({
	selectedModel,
	onSelectModel,
}: ModelSelectorProps) {
	const [filterTier, setFilterTier] = useState<
		"all" | "free" | "low" | "medium" | "high"
	>("all");
	const [sortBy, setSortBy] = useState<"cost" | "quality" | "speed" | "tier">(
		"tier",
	);

	// Filter by tier
	const filteredModels =
		filterTier === "all"
			? MODELS_2026
			: MODELS_2026.filter((m) => m.tier === filterTier);

	// Sort models
	const sortedModels = [...filteredModels].sort((a, b) => {
		if (sortBy === "cost") {
			return a.inputCost + a.outputCost - (b.inputCost + b.outputCost);
		} else if (sortBy === "quality") {
			return b.quality - a.quality;
		} else if (sortBy === "speed") {
			const speedOrder = { fast: 0, medium: 1, slow: 2 };
			return speedOrder[a.speed] - speedOrder[b.speed];
		} else {
			// Sort by tier (free -> low -> medium -> high)
			const tierOrder = { free: 0, low: 1, medium: 2, high: 3 };
			return tierOrder[a.tier] - tierOrder[b.tier];
		}
	});

	const calculateCost = (
		model: Model,
		inputTokens: number,
		outputTokens: number,
	) => {
		if (model.inputCost === 0 && model.outputCost === 0) return "FREE";
		const inputCost = (inputTokens / 1_000_000) * model.inputCost;
		const outputCost = (outputTokens / 1_000_000) * model.outputCost;
		return `$${(inputCost + outputCost).toFixed(2)}`;
	};

	const getTierBadge = (tier: string) => {
		const badges = {
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
		return badges[tier as keyof typeof badges];
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-2">
				<h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
					Select AI Model
				</h3>
				<span className="text-xs text-gray-500">Jan 2026</span>
			</div>

			{/* Tier Filter */}
			<div className="flex gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => setFilterTier("all")}
					className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
						filterTier === "all"
							? "bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
							: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-300"
					}`}
				>
					All ({MODELS_2026.length})
				</button>
				<button
					type="button"
					onClick={() => setFilterTier("free")}
					className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
						filterTier === "free"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
							: "bg-cyan-500/5 text-cyan-400/70 border border-cyan-500/10 hover:bg-cyan-500/10 hover:text-cyan-400"
					}`}
				>
					<Sparkles className="w-3 h-3 inline mr-1" />
					FREE ({MODELS_2026.filter((m) => m.tier === "free").length})
				</button>
				<button
					type="button"
					onClick={() => setFilterTier("low")}
					className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
						filterTier === "low"
							? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(185,51,255,0.2)]"
							: "bg-purple-500/5 text-purple-400/70 border border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400"
					}`}
				>
					Low ({MODELS_2026.filter((m) => m.tier === "low").length})
				</button>
				<button
					type="button"
					onClick={() => setFilterTier("medium")}
					className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
						filterTier === "medium"
							? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_10px_rgba(255,0,170,0.2)]"
							: "bg-pink-500/5 text-pink-400/70 border border-pink-500/10 hover:bg-pink-500/10 hover:text-pink-400"
					}`}
				>
					Medium ({MODELS_2026.filter((m) => m.tier === "medium").length})
				</button>
				<button
					type="button"
					onClick={() => setFilterTier("high")}
					className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
						filterTier === "high"
							? "bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(255,165,0,0.2)]"
							: "bg-orange-500/5 text-orange-400/70 border border-orange-500/10 hover:bg-orange-500/10 hover:text-orange-400"
					}`}
				>
					High ({MODELS_2026.filter((m) => m.tier === "high").length})
				</button>
			</div>

			{/* Sort Options */}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => setSortBy("tier")}
					className={`px-3 py-1 text-xs rounded transition-all ${
						sortBy === "tier"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
							: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
					}`}
				>
					By Tier
				</button>
				<button
					type="button"
					onClick={() => setSortBy("cost")}
					className={`px-3 py-1 text-xs rounded transition-all ${
						sortBy === "cost"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
							: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
					}`}
				>
					<DollarSign className="w-3 h-3 inline mr-1" />
					Cost
				</button>
				<button
					type="button"
					onClick={() => setSortBy("quality")}
					className={`px-3 py-1 text-xs rounded transition-all ${
						sortBy === "quality"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
							: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
					}`}
				>
					<Brain className="w-3 h-3 inline mr-1" />
					Quality
				</button>
				<button
					type="button"
					onClick={() => setSortBy("speed")}
					className={`px-3 py-1 text-xs rounded transition-all ${
						sortBy === "speed"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
							: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
					}`}
				>
					<Zap className="w-3 h-3 inline mr-1" />
					Speed
				</button>
			</div>

			{/* Cost Estimate */}
			<div className="bg-cyan-500/5 p-3 rounded-lg text-sm border border-cyan-500/20 backdrop-blur-sm">
				<div className="font-semibold mb-1 text-cyan-300">
					💡 Estimated Cost (1M input + 100K output):
				</div>
				<div className="text-gray-400">
					FREE: $0 • Low: $0.25-$1 • Medium: $1-$5 • High: $5-$30
				</div>
			</div>

			{/* Model Cards */}
			<div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
				{sortedModels.map((model) => (
					<ModelCard
						key={model.id}
						model={model}
						isSelected={selectedModel === model.id}
						onSelect={() => onSelectModel(model.id)}
						estimatedCost={calculateCost(model, 1_000_000, 100_000)}
						tierBadge={getTierBadge(model.tier)}
					/>
				))}
			</div>
		</div>
	);
}

interface ModelCardProps {
	model: Model;
	isSelected: boolean;
	onSelect: () => void;
	estimatedCost: string;
	tierBadge: { label: string; color: string };
}

function ModelCard({
	model,
	isSelected,
	onSelect,
	estimatedCost,
	tierBadge,
}: ModelCardProps) {
	const speedColors = {
		fast: "text-cyan-400",
		medium: "text-purple-400",
		slow: "text-pink-400",
	};

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`w-full text-left p-4 rounded-lg border transition-all backdrop-blur-sm ${
				isSelected
					? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.15)]"
					: "border-white/10 bg-black/40 hover:border-cyan-500/30 hover:bg-white/5"
			} ${model.recommended ? "ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(185,51,255,0.1)]" : ""}`}
		>
			<div className="flex items-start justify-between mb-2">
				<div className="flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="font-semibold text-white">{model.name}</h4>
						<span
							className={`px-2 py-0.5 text-xs rounded font-medium ${tierBadge.color}`}
						>
							{tierBadge.label}
						</span>
						{model.recommended && (
							<span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded font-medium border border-purple-500/30">
								⭐ Top Pick
							</span>
						)}
						{isSelected && <Check className="w-5 h-5 text-cyan-400" />}
					</div>
					<div className="text-xs text-gray-500 mt-1">{model.provider}</div>
				</div>
				<div className="text-right ml-2">
					<div className="text-sm font-semibold text-cyan-400">
						{estimatedCost}
					</div>
					<div className="text-xs text-gray-500">per session</div>
				</div>
			</div>

			<div className="text-sm text-gray-400 mb-3">{model.bestFor}</div>

			<div className="flex items-center gap-4 text-xs flex-wrap text-gray-400">
				<div className="flex items-center gap-1">
					<DollarSign className="w-3 h-3 text-cyan-400/70" />
					<span>
						${model.inputCost}/${model.outputCost}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Brain className="w-3 h-3 text-purple-400/70" />
					<span>{"⭐".repeat(model.quality)}</span>
				</div>
				<div className={`flex items-center gap-1 ${speedColors[model.speed]}`}>
					<Zap className="w-3 h-3" />
					<span className="capitalize">{model.speed}</span>
				</div>
				<div className="flex items-center gap-1">
					<Clock className="w-3 h-3 text-pink-400/70" />
					<span>{model.contextWindow}</span>
				</div>
			</div>
		</button>
	);
}
