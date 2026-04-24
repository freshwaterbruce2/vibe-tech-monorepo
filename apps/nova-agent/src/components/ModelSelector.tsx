import { Brain, DollarSign, Sparkles, Zap } from "lucide-react";
import React, { useState } from "react";
import { ModelCard } from "./ModelCard";
import {
	MODELS_2026,
	calculateCost,
	filterByTier,
	getTierBadge,
	sortModels,
	type SortKey,
	type TierKey,
} from "./models-config";

interface ModelSelectorProps {
	selectedModel: string;
	onSelectModel: (modelId: string) => void;
}

type FilterTier = "all" | TierKey;

const TIER_FILTER_STYLES: Record<FilterTier, { active: string; inactive: string }> = {
	all: {
		active: "bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]",
		inactive: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-300",
	},
	free: {
		active: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,255,255,0.2)]",
		inactive: "bg-cyan-500/5 text-cyan-400/70 border border-cyan-500/10 hover:bg-cyan-500/10 hover:text-cyan-400",
	},
	low: {
		active: "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(185,51,255,0.2)]",
		inactive: "bg-purple-500/5 text-purple-400/70 border border-purple-500/10 hover:bg-purple-500/10 hover:text-purple-400",
	},
	medium: {
		active: "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_10px_rgba(255,0,170,0.2)]",
		inactive: "bg-pink-500/5 text-pink-400/70 border border-pink-500/10 hover:bg-pink-500/10 hover:text-pink-400",
	},
	high: {
		active: "bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(255,165,0,0.2)]",
		inactive: "bg-orange-500/5 text-orange-400/70 border border-orange-500/10 hover:bg-orange-500/10 hover:text-orange-400",
	},
};

const TIER_LABELS: Record<FilterTier, string> = {
	all: "All",
	free: "FREE",
	low: "Low",
	medium: "Medium",
	high: "High",
};

const SORT_OPTIONS: { key: SortKey; label: string; icon?: React.ReactNode }[] = [
	{ key: "tier", label: "By Tier" },
	{ key: "cost", label: "Cost", icon: <DollarSign className="w-3 h-3 inline mr-1" /> },
	{ key: "quality", label: "Quality", icon: <Brain className="w-3 h-3 inline mr-1" /> },
	{ key: "speed", label: "Speed", icon: <Zap className="w-3 h-3 inline mr-1" /> },
];

function tierCount(tier: TierKey): number {
	return MODELS_2026.filter((m) => m.tier === tier).length;
}

export default function ModelSelector({
	selectedModel,
	onSelectModel,
}: ModelSelectorProps) {
	const [filterTier, setFilterTier] = useState<FilterTier>("all");
	const [sortBy, setSortBy] = useState<SortKey>("tier");

	const sortedModels = sortModels(filterByTier(MODELS_2026, filterTier), sortBy);

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
				{(["all", "free", "low", "medium", "high"] as FilterTier[]).map((tier) => {
					const styles = TIER_FILTER_STYLES[tier];
					const isActive = filterTier === tier;
					const count = tier === "all" ? MODELS_2026.length : tierCount(tier as TierKey);
					return (
						<button
							key={tier}
							type="button"
							onClick={() => setFilterTier(tier)}
							className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
								isActive ? styles.active : styles.inactive
							}`}
						>
							{tier === "free" && <Sparkles className="w-3 h-3 inline mr-1" />}
							{TIER_LABELS[tier]} ({count})
						</button>
					);
				})}
			</div>

			{/* Sort Options */}
			<div className="flex gap-2">
				{SORT_OPTIONS.map((opt) => (
					<button
						key={opt.key}
						type="button"
						onClick={() => setSortBy(opt.key)}
						className={`px-3 py-1 text-xs rounded transition-all ${
							sortBy === opt.key
								? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
								: "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
						}`}
					>
						{opt.icon}
						{opt.label}
					</button>
				))}
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
