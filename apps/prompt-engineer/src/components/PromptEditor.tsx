import {
	ArrowRight,
	Check,
	Copy,
	FileText,
	Loader2,
	Sparkles,
	Wand2,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface PromptEditorProps {
	inputPrompt: string;
	onInputChange: (value: string) => void;
	optimizedPrompt: string;
	isOptimizing: boolean;
	error: string | null;
	retryAfter: number;
	onOptimize: () => void;
}

export function PromptEditor({
	inputPrompt,
	onInputChange,
	optimizedPrompt,
	isOptimizing,
	error,
	retryAfter,
	onOptimize,
}: PromptEditorProps) {
	const [copied, setCopied] = useState(false);
	const [inputFocused, setInputFocused] = useState(false);

	const handleCopy = async () => {
		if (!optimizedPrompt) return;
		await navigator.clipboard.writeText(optimizedPrompt);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const isDisabled = isOptimizing || retryAfter > 0 || !inputPrompt.trim();
	const charCount = inputPrompt.length;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			{/* Input prompt */}
			<Card
				className={`glass-card card-3d overflow-hidden transition-all duration-500 ${
					inputFocused ? "ring-2 ring-violet-300 ring-offset-2" : ""
				}`}
			>
				<CardHeader className="pb-3 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent border-b border-violet-100/50">
					<CardTitle className="text-lg flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
								<Zap className="h-4 w-4" />
							</span>
							<span className="font-semibold">Input Prompt</span>
						</div>
						<span
							className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
								charCount > 0
									? "bg-violet-100 text-violet-600"
									: "bg-gray-100 text-gray-400"
							}`}
						>
							{charCount.toLocaleString()} chars
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 pt-4">
					<div className="relative">
						<Textarea
							placeholder="Paste your prompt here and watch the magic happen..."
							value={inputPrompt}
							onChange={(e) => onInputChange(e.target.value)}
							onFocus={() => setInputFocused(true)}
							onBlur={() => setInputFocused(false)}
							className="min-h-[280px] resize-none font-mono text-sm bg-white/80 border-violet-200/50 focus:border-violet-400 focus:ring-violet-300 transition-all rounded-xl pr-4"
						/>
						{!inputPrompt && (
							<div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 text-violet-300">
								<FileText className="h-4 w-4" />
							</div>
						)}
					</div>
					<Button
						onClick={onOptimize}
						disabled={isDisabled}
						className="w-full h-14 text-base font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl transition-all duration-500 glow-hover group rounded-xl press-effect disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isOptimizing ? (
							<div className="flex items-center gap-3">
								<div className="relative">
									<Loader2 className="h-5 w-5 animate-spin" />
									<Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-300 animate-pulse" />
								</div>
								<span>Crafting your perfect prompt...</span>
							</div>
						) : retryAfter > 0 ? (
							<div className="flex items-center gap-2">
								<span className="text-2xl">⏳</span>
								<span>Rate limited • Wait {retryAfter}s</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Wand2 className="h-5 w-5 group-hover:rotate-12 transition-transform" />
								<span>Optimize Prompt</span>
								<Sparkles className="h-4 w-4 group-hover:scale-125 transition-transform" />
								<ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
							</div>
						)}
					</Button>
				</CardContent>
			</Card>

			{/* Output prompt */}
			<Card
				className={`glass-card card-3d overflow-hidden transition-all duration-500 ${
					optimizedPrompt ? "ring-2 ring-cyan-200 ring-offset-2" : ""
				}`}
			>
				<CardHeader className="pb-3 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border-b border-cyan-100/50">
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg flex items-center gap-2">
							<span className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md">
								<Sparkles className="h-4 w-4" />
							</span>
							<span className="font-semibold">Optimized Prompt</span>
						</CardTitle>
						{optimizedPrompt && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCopy}
								className={`h-9 px-3 rounded-xl transition-all duration-300 ${
									copied
										? "bg-green-100 text-green-700 hover:bg-green-100"
										: "hover:bg-cyan-100 hover:text-cyan-700"
								}`}
							>
								{copied ? (
									<>
										<Check className="mr-1.5 h-4 w-4" />
										<span className="font-medium">Copied!</span>
									</>
								) : (
									<>
										<Copy className="mr-1.5 h-4 w-4" />
										<span>Copy</span>
									</>
								)}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="pt-4">
					{error ? (
						<div className="rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-5 shadow-inner">
							<p className="text-sm font-bold flex items-center gap-2 text-red-600">
								<span className="text-lg">⚠️</span>
								Something went wrong
							</p>
							<p className="text-sm mt-2 text-red-500/80">{error}</p>
						</div>
					) : (
						<div
							className={`min-h-[280px] rounded-xl border p-5 font-mono text-sm whitespace-pre-wrap transition-all duration-500 ${
								isOptimizing
									? "bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-violet-300 animate-pulse"
									: optimizedPrompt
										? "bg-gradient-to-br from-white to-cyan-50/50 border-cyan-200 shadow-inner"
										: "bg-gradient-to-br from-gray-50/50 to-white border-gray-200"
							}`}
						>
							{isOptimizing ? (
								<div className="flex flex-col items-center justify-center h-full gap-4 text-violet-400">
									<div className="relative">
										<Sparkles className="h-12 w-12 animate-pulse" />
										<div className="absolute inset-0 animate-ping">
											<Sparkles className="h-12 w-12 opacity-30" />
										</div>
									</div>
									<p className="text-sm font-medium">
										AI is working its magic...
									</p>
								</div>
							) : optimizedPrompt ? (
								<div className="text-foreground leading-relaxed">
									{optimizedPrompt}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/50">
									<Sparkles className="h-8 w-8" />
									<p className="text-sm text-center">
										Your AI-optimized prompt
										<br />
										will appear here
									</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
