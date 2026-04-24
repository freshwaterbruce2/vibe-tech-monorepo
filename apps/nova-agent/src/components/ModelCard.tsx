import { Brain, Check, Clock, DollarSign, Zap } from "lucide-react";
import React from "react";
import type { Model, TierBadge } from "./models-config";

export interface ModelCardProps {
	model: Model;
	isSelected: boolean;
	onSelect: () => void;
	estimatedCost: string;
	tierBadge: TierBadge;
}

const SPEED_COLORS: Record<Model["speed"], string> = {
	fast: "text-cyan-400",
	medium: "text-purple-400",
	slow: "text-pink-400",
};

export function ModelCard({
	model,
	isSelected,
	onSelect,
	estimatedCost,
	tierBadge,
}: ModelCardProps) {
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
				<div className={`flex items-center gap-1 ${SPEED_COLORS[model.speed]}`}>
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
