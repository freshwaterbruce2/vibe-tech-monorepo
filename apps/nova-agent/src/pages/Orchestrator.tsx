import { useState, useRef, useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/hooks/use-toast";
import { ComputerUseService, type ActiveWindowInfo } from "@/services/computerUseService";
import { executeAction } from "./nova-hands/actionExecutor";
import type { AgentAction, HistoryItem } from "./nova-hands/types";

// Import modular sub-components
import { DisplayViewport } from "./orchestrator/components/DisplayViewport";
import { HistoryLog } from "./orchestrator/components/HistoryLog";
import { ControlConsole } from "./orchestrator/components/ControlConsole";
import { StatusPanel } from "./orchestrator/components/StatusPanel";
import { ConsentGate } from "./orchestrator/components/ConsentGate";

const Orchestrator = () => {
	const [goal, setGoal] = useState("");
	const [isLoopRunning, setIsLoopRunning] = useState(false);
	const [isAutoMode, setIsAutoMode] = useState(false);
	const [loopStatus, setLoopStatus] = useState<"idle" | "observing" | "analyzing" | "awaiting_consent" | "simulating">("idle");
	const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
	const [focusedWindow, setFocusedWindow] = useState<ActiveWindowInfo | null>(null);
	const [currentThought, setCurrentThought] = useState("");
	const [nextAction, setNextAction] = useState<AgentAction | null>(null);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

	const loopRunningRef = useRef(isLoopRunning);
	useEffect(() => {
		loopRunningRef.current = isLoopRunning;
	}, [isLoopRunning]);

	const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = Math.floor(((e.clientX - rect.left) / rect.width) * 1000);
		const y = Math.floor(((e.clientY - rect.top) / rect.height) * 1000);
		setHoverCoords({ x, y });
	};

	const handleImageMouseLeave = () => {
		setHoverCoords(null);
	};

	const startAgentLoop = async () => {
		if (!goal.trim()) {
			toast({ title: "Input Required", description: "Please enter a goal first.", variant: "destructive" });
			return;
		}
		setIsLoopRunning(true);
		setError(null);
		
		await runLoopStep(true);
	};

	const stopAgentLoop = () => {
		setIsLoopRunning(false);
		setLoopStatus("idle");
	};

	const runLoopStep = async (shouldContinue: boolean) => {
		if (!shouldContinue && !loopRunningRef.current) return;
		
		try {
			setLoopStatus("observing");
			const screenshotBase64 = await ComputerUseService.captureDisplay();
			setCurrentScreenshot(screenshotBase64);

			let activeWin: ActiveWindowInfo | null = null;
			try {
				activeWin = await ComputerUseService.getFocusedWindow();
				setFocusedWindow(activeWin);
			} catch (e) {
				console.warn("Failed to retrieve active window info:", e);
			}

			setLoopStatus("analyzing");
			
			const systemPrompt = `You are an AI desktop assistant with direct computer control capabilities.
Your goal is: "${goal}"

You operate on a normalized screen coordinates grid of 1000x1000 pixels (X and Y are between 0 and 999).
Active Window: ${activeWin ? `${activeWin.process_name} - "${activeWin.title}"` : "unknown"}

Return your next action in JSON format inside markdown blocks:
\`\`\`json
{
  "thought": "Explain what you see and what action you will take.",
  "action": {
    "type": "mouse",
    "action": "click" | "move" | "right_click" | "double_click" | "drag_to",
    "x": 450,
    "y": 200
  }
}
\`\`\`
For keyboard actions:
\`\`\`json
{
  "thought": "Explain what you will type.",
  "action": {
    "type": "keyboard",
    "action": "type",
    "text": "text to type"
  }
}
\`\`\`
For special keys:
\`\`\`json
{
  "thought": "Pressing enter key to submit form.",
  "action": {
    "type": "keyboard",
    "action": "press_key",
    "key": "enter"
  }
}
\`\`\`
For keyboard shortcuts (hotkeys):
\`\`\`json
{
  "thought": "Copying selected text.",
  "action": {
    "type": "keyboard",
    "action": "hotkey",
    "key": "c",
    "modifiers": ["ctrl"]
  }
}
\`\`\`
When the goal is fully achieved:
\`\`\`json
{
  "thought": "Task complete.",
  "action": {
    "type": "done"
  }
}
\`\`\`

Available actions:
- Mouse:
  { "type": "mouse", "action": "move" | "click" | "right_click" | "double_click" | "drag_to", "x": 0..999, "y": 0..999 }
- Keyboard:
  { "type": "keyboard", "action": "type", "text": "string to type" }
  { "type": "keyboard", "action": "press_key", "key": "enter" | "backspace" | "tab" | "escape" | "space" | "up" | "down" | "left" | "right" | "ctrl" | "shift" | "alt" }
  { "type": "keyboard", "action": "hotkey", "key": "character (e.g. 'c')", "modifiers": ["ctrl" | "alt" | "shift" | "win"] }
- Task completed:
  { "type": "done" }

Take step-by-step actions. Output ONLY the JSON block inside markdown.`;

			const response = await ComputerUseService.callMultimodalLlm([
				{
					role: "user",
					text: "Analyze the current screen and return the next action.",
					image_base64: screenshotBase64
				}
			], systemPrompt);

			const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ?? [null, response];
			const jsonText = jsonMatch[1] ?? response;
			const payload = JSON.parse(jsonText.trim());

			setCurrentThought(payload.thought);
			setNextAction(payload.action as AgentAction);
			setLoopStatus("awaiting_consent");

			if (isAutoMode) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				await handleApproveAction(payload.action);
			}
		} catch (err) {
			setError(String(err));
			setIsLoopRunning(false);
			setLoopStatus("idle");
		}
	};

	const handleApproveAction = async (action: AgentAction) => {
		if (!action) return;
		setLoopStatus("simulating");
		try {
			const historyItem = await executeAction(action, { currentThought });

			if (historyItem) {
				setHistory((prev) => [historyItem, ...prev]);
				setNextAction(null);
				if (loopRunningRef.current) {
					await new Promise((resolve) => setTimeout(resolve, 800));
					void runLoopStep(false);
				} else {
					setLoopStatus("idle");
				}
			} else {
				toast({ title: "Task Complete", description: "The agent has completed the task successfully!" });
				setIsLoopRunning(false);
				setLoopStatus("idle");
				setNextAction(null);
			}
		} catch (err) {
			setError(String(err));
			setIsLoopRunning(false);
			setLoopStatus("idle");
		}
	};

	const handleRejectAction = () => {
		setIsLoopRunning(false);
		setLoopStatus("idle");
		setNextAction(null);
		toast({ title: "Action Rejected", description: "Orchestration loop paused by user." });
	};

	const handleRefreshScreenshot = async () => {
		try {
			const screenshotBase64 = await ComputerUseService.captureDisplay();
			setCurrentScreenshot(screenshotBase64);
			toast({ title: "Screen Captured", description: "Screenshot updated successfully." });
		} catch (e) {
			setError(String(e));
		}
	};

	return (
		<PageLayout
			title="Nova Hands"
			description="OS-level desktop automation loop. Direct mouse and keyboard control backed by Gemini."
		>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Screen View */}
				<div className="lg:col-span-2 space-y-6">
					<DisplayViewport
						currentScreenshot={currentScreenshot}
						nextAction={nextAction}
						hoverCoords={hoverCoords}
						handleImageMouseMove={handleImageMouseMove}
						handleImageMouseLeave={handleImageMouseLeave}
						handleRefreshScreenshot={() => { void handleRefreshScreenshot(); }}
					/>

					<HistoryLog history={history} />
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<ControlConsole
						goal={goal}
						setGoal={setGoal}
						isLoopRunning={isLoopRunning}
						isAutoMode={isAutoMode}
						setIsAutoMode={setIsAutoMode}
						startAgentLoop={() => { void startAgentLoop(); }}
						stopAgentLoop={() => { void stopAgentLoop(); }}
					/>

					<StatusPanel
						loopStatus={loopStatus}
						focusedWindow={focusedWindow}
						error={error}
					/>

					{loopStatus === "awaiting_consent" && nextAction && (
						<ConsentGate
							nextAction={nextAction}
							currentThought={currentThought}
							handleRejectAction={handleRejectAction}
							handleApproveAction={(action) => { void handleApproveAction(action); }}
						/>
					)}
				</div>
			</div>
		</PageLayout>
	);
};

export default Orchestrator;
