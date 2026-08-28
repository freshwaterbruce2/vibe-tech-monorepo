import { Activity, Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AgentAction } from "../../nova-hands/types";

interface DisplayViewportProps {
	currentScreenshot: string | null;
	nextAction: AgentAction | null;
	hoverCoords: { x: number; y: number } | null;
	handleImageMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
	handleImageMouseLeave: () => void;
	handleRefreshScreenshot: () => void;
}

export const DisplayViewport = ({
	currentScreenshot,
	nextAction,
	hoverCoords,
	handleImageMouseMove,
	handleImageMouseLeave,
	handleRefreshScreenshot,
}: DisplayViewportProps) => {
	return (
		<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl hover:shadow-neon-blue transition-all duration-300 relative overflow-hidden">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2 text-aura-neonBlue">
					<Eye className="w-6 h-6" />
					<h2 className="text-xl font-bold tracking-tight text-white uppercase">
						Display Viewport
					</h2>
				</div>
				<div className="flex items-center gap-2">
					{hoverCoords && (
						<Badge variant="outline" className="font-mono text-xs text-white border-white/20">
							X: {hoverCoords.x}, Y: {hoverCoords.y}
						</Badge>
					)}
					<Button variant="ghost" size="icon" onClick={handleRefreshScreenshot} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8">
						<RefreshCw className="w-4 h-4" />
					</Button>
				</div>
			</div>

			<div 
				className="relative border border-white/10 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center cursor-crosshair"
				onMouseMove={handleImageMouseMove}
				onMouseLeave={handleImageMouseLeave}
			>
				{currentScreenshot ? (
					<>
						<img 
							src={`data:image/png;base64,${currentScreenshot}`} 
							alt="Display buffer" 
							className="w-full h-full object-contain pointer-events-none"
						/>
						{/* Render click/move target overlay */}
						{nextAction?.type === "mouse" && (
							<div 
								className="absolute w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/20 flex items-center justify-center pointer-events-none -translate-x-1/2 -translate-y-1/2"
								style={{ 
									left: `${nextAction.x / 10}%`, 
									top: `${nextAction.y / 10}%` 
								}}
							>
								<div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
							</div>
						)}
					</>
				) : (
					<div className="text-center p-12 text-aura-textSecondary space-y-4">
						<Activity className="w-12 h-12 mx-auto opacity-40 animate-pulse" />
						<p className="text-sm">No display captured yet. Click start or capture display to initialize.</p>
					</div>
				)}
			</div>
		</Card>
	);
};
