import type React from "react";
import { toast } from "@/hooks/use-toast";
import { ComputerUseService, type ActiveWindowInfo } from "@/services/computerUseService";
import { executeAction } from "./actionExecutor";
import { buildSystemPrompt } from "./promptBuilder";
import { parseAgentResponse } from "./responseParser";
import type { AgentAction, HistoryItem } from "./types";

export type LoopStatus = "idle" | "observing" | "analyzing" | "awaiting_consent" | "simulating";

type HistorySetter = React.Dispatch<React.SetStateAction<HistoryItem[]>>;

export interface LoopState {
	goal: string;
	currentThought: string;
	setLoopStatus: (status: LoopStatus) => void;
	setCurrentScreenshot: (screenshot: string | null) => void;
	setFocusedWindow: (window: ActiveWindowInfo | null) => void;
	setCurrentThought: (thought: string) => void;
	setNextAction: (action: AgentAction | null) => void;
	setHistory: HistorySetter;
	setError: (error: string | null) => void;
	setIsLoopRunning: (running: boolean) => void;
	loopRunningRef: React.MutableRefObject<boolean>;
	isAutoModeRef: React.MutableRefObject<boolean>;
}

async function queryAgentForAction(
	goal: string,
	activeWin: ActiveWindowInfo | null,
	screenshotBase64: string,
) {
	const systemPrompt = buildSystemPrompt(goal, activeWin);
	const response = await ComputerUseService.callMultimodalLlm(
		[
			{
				role: "user",
				text: "Analyze the current screen and return the next action.",
				image_base64: screenshotBase64,
			},
		],
		systemPrompt,
	);
	return parseAgentResponse(response);
}

async function captureScreenAndUpdateUi(state: Pick<LoopState, "setLoopStatus" | "setCurrentScreenshot" | "setFocusedWindow">) {
	state.setLoopStatus("observing");
	const screenshotBase64 = await ComputerUseService.captureDisplay();
	state.setCurrentScreenshot(screenshotBase64);

	let activeWin: ActiveWindowInfo | null = null;
	try {
		activeWin = await ComputerUseService.getFocusedWindow();
		state.setFocusedWindow(activeWin);
	} catch (e) {
		console.warn("Failed to retrieve active window info:", e);
	}

	return { screenshotBase64, activeWin };
}

export async function runAgentLoopStep(
	state: LoopState,
	handleApproveAction: (action: AgentAction) => Promise<void>,
	shouldContinue: boolean,
): Promise<void> {
	if (!shouldContinue && !state.loopRunningRef.current) return;

	try {
		state.setLoopStatus("observing");
		const { screenshotBase64, activeWin } = await captureScreenAndUpdateUi(state);
		state.setLoopStatus("analyzing");
		const { thought, action } = await queryAgentForAction(state.goal, activeWin, screenshotBase64);

		state.setCurrentThought(thought);
		state.setNextAction(action);
		state.setLoopStatus("awaiting_consent");

		if (state.isAutoModeRef.current) {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			await handleApproveAction(action);
		}
	} catch (err) {
		state.setError(String(err));
		state.setIsLoopRunning(false);
		state.setLoopStatus("idle");
	}
}

export async function handleApprovedAction(
	state: LoopState,
	runLoopStep: (shouldContinue: boolean) => Promise<void>,
	action: AgentAction,
): Promise<void> {
	state.setLoopStatus("simulating");
	try {
		const historyItem = await executeAction(action, { currentThought: state.currentThought });

		if (historyItem) {
			state.setHistory((prev) => [historyItem, ...prev]);
			state.setNextAction(null);
			if (state.loopRunningRef.current) {
				await new Promise((resolve) => setTimeout(resolve, 800));
				void runLoopStep(false);
			} else {
				state.setLoopStatus("idle");
			}
		} else {
			toast({ title: "Task Complete", description: "The agent has completed the task successfully!" });
			state.setIsLoopRunning(false);
			state.setLoopStatus("idle");
			state.setNextAction(null);
		}
	} catch (err) {
		state.setError(String(err));
		state.setIsLoopRunning(false);
		state.setLoopStatus("idle");
	}
}
