import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeScreenshot } from "@/services/visionService";

interface ScreenshotResult {
	path: string;
	timestamp: number;
	width: number;
	height: number;
}

interface ScreenshotButtonProps {
	onAnalysisComplete?: (analysis: string, imagePath: string) => void;
	customPrompt?: string;
}

export function ScreenshotButton({
	onAnalysisComplete,
	customPrompt,
}: ScreenshotButtonProps) {
	const [isCapturing, setIsCapturing] = useState(false);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const { toast } = useToast();

	const handleScreenshot = async () => {
		try {
			setIsCapturing(true);

			// Capture screenshot using Tauri command
			const result = await invoke<ScreenshotResult>("capture_screenshot");

			toast({
				title: "Screenshot Captured",
				description: `Saved to: ${result.path}`,
			});

			setIsCapturing(false);
			setIsAnalyzing(true);

			// Analyze screenshot with vision service
			const analysis = await analyzeScreenshot(result.path, {
				prompt: customPrompt,
			});

			toast({
				title: "Analysis Complete",
				description: "Screenshot analyzed successfully",
			});

			// Call callback if provided
			if (onAnalysisComplete) {
				onAnalysisComplete(analysis.analysis, result.path);
			}

			// Also show analysis in toast
			toast({
				title: "Vision Analysis",
				description: analysis.analysis.slice(0, 200) + "...",
				duration: 10000,
			});
		} catch (error) {
			console.error("Screenshot error:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to capture or analyze screenshot",
				variant: "destructive",
			});
		} finally {
			setIsCapturing(false);
			setIsAnalyzing(false);
		}
	};

	return (
		<Button
			onClick={handleScreenshot}
			disabled={isCapturing || isAnalyzing}
			className="bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden"
			size="icon"
			title="Capture & Analyze Screenshot"
		>
			{isCapturing || isAnalyzing ? (
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
				>
					<Loader2 className="w-4 h-4" />
				</motion.div>
			) : (
				<Camera className="w-4 h-4" />
			)}

			{/* Animated background on hover */}
			<motion.div
				className="absolute inset-0 bg-white/10"
				initial={{ scale: 0, opacity: 0 }}
				whileHover={{ scale: 1.5, opacity: 0.3 }}
				transition={{ duration: 0.3 }}
				style={{ borderRadius: "50%" }}
			/>
		</Button>
	);
}
