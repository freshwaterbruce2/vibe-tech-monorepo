import { Clock, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/services/predictionService";

interface PredictiveCardProps {
	prediction: Recommendation;
	estimatedTime: string;
	confidence: number; // 0 to 1
	onStart: () => void;
}

/**
 * Card component showing ML prediction with time estimate and confidence meter
 */
export function PredictiveCard({
	prediction,
	estimatedTime,
	confidence,
	onStart,
}: PredictiveCardProps) {
	// Confidence level styling
	const getConfidenceColor = (conf: number): string => {
		if (conf >= 0.8) return "text-green-400";
		if (conf >= 0.6) return "text-yellow-400";
		return "text-orange-400";
	};

	const getConfidenceLabel = (conf: number): string => {
		if (conf >= 0.8) return "High confidence";
		if (conf >= 0.6) return "Medium confidence";
		return "Low confidence";
	};

	return (
		<div className="border border-purple-500/30 bg-black/40 rounded-lg p-4 hover:border-purple-500/50 transition-colors">
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1">
					<h4 className="font-semibold text-white text-sm mb-1">
						{prediction.title}
					</h4>
					<p className="text-xs text-white/50 uppercase tracking-wider">
						{prediction.category}
					</p>
				</div>
				<div
					className={`text-xs px-2 py-1 rounded border ${
						prediction.priority === "critical"
							? "bg-red-500/20 text-red-300 border-red-500/30"
							: prediction.priority === "high"
								? "bg-orange-500/20 text-orange-300 border-orange-500/30"
								: prediction.priority === "medium"
									? "bg-blue-500/20 text-blue-300 border-blue-500/30"
									: "bg-gray-500/20 text-gray-300 border-gray-500/30"
					}`}
				>
					{prediction.priority}
				</div>
			</div>

			{/* Description */}
			<p className="text-sm text-gray-300 mb-4">{prediction.description}</p>

			{/* Metrics */}
			<div className="grid grid-cols-2 gap-3 mb-4">
				{/* Estimated Time */}
				<div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
					<Clock className="w-4 h-4 text-cyan-400" />
					<div>
						<div className="text-xs text-white/50">Estimated Time</div>
						<div className="text-sm font-semibold text-white">
							{estimatedTime}
						</div>
					</div>
				</div>

				{/* Confidence */}
				<div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
					<TrendingUp className={`w-4 h-4 ${getConfidenceColor(confidence)}`} />
					<div>
						<div className="text-xs text-white/50">Confidence</div>
						<div
							className={`text-sm font-semibold ${getConfidenceColor(confidence)}`}
						>
							{Math.round(confidence * 100)}%
						</div>
					</div>
				</div>
			</div>

			{/* Confidence Meter */}
			<div className="mb-4">
				<div className="flex items-center justify-between mb-1">
					<span className="text-xs text-white/50">
						{getConfidenceLabel(confidence)}
					</span>
					<span className="text-xs text-white/50">
						{Math.round(confidence * 100)}%
					</span>
				</div>
				<div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
					<div
						className={`h-full transition-all duration-500 ${
							confidence >= 0.8
								? "bg-gradient-to-r from-green-500 to-green-400"
								: confidence >= 0.6
									? "bg-gradient-to-r from-yellow-500 to-yellow-400"
									: "bg-gradient-to-r from-orange-500 to-orange-400"
						}`}
						style={{ width: `${confidence * 100}%` }}
					/>
				</div>
			</div>

			{/* Estimated Impact */}
			{prediction.estimated_impact && (
				<div className="flex items-center gap-2 mb-4 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
					<Zap className="w-4 h-4 text-purple-400" />
					<span className="text-sm text-purple-300">
						{prediction.estimated_impact}
					</span>
				</div>
			)}

			{/* Action Button */}
			<Button
				onClick={onStart}
				className="w-full bg-purple-600 hover:bg-purple-700 text-white"
			>
				{prediction.action_label ?? "Start Now"}
			</Button>
		</div>
	);
}
