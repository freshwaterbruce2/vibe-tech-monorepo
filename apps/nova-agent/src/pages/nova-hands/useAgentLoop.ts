import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { ComputerUseService, type ActiveWindowInfo } from "@/services/computerUseService";
import { handleApprovedAction, runAgentLoopStep, type LoopState, type LoopStatus } from "./loopEngine";
import type { AgentAction, HistoryItem } from "./types";

export type { LoopStatus } from "./loopEngine";

export interface UseAgentLoopReturn {
	goal: string;
	setGoal: (goal: string) => void;
	isLoopRunning: boolean;
	isAutoMode: boolean;
	setIsAutoMode: (value: boolean) => void;
	loopStatus: LoopStatus;
	currentScreenshot: string | null;
	focusedWindow: ActiveWindowInfo | null;
	currentThought: string;
	nextAction: AgentAction | null;
	history: HistoryItem[];
	error: string | null;
	hoverCoords: { x: number; y: number } | null;
	startAgentLoop: () => Promise<void>;
	stopAgentLoop: () => void;
	handleApproveAction: (action: AgentAction) => Promise<void>;
	handleRejectAction: () => void;
	handleRefreshScreenshot: () => Promise<void>;
	handleImageMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
	handleImageMouseLeave: () => void;
}

type AgentLoopState = LoopState & {
	setGoal: React.Dispatch<React.SetStateAction<string>>;
	isLoopRunning: boolean;
	setIsAutoMode: React.Dispatch<React.SetStateAction<boolean>>;
	isAutoMode: boolean;
	loopStatus: LoopStatus;
	currentScreenshot: string | null;
	focusedWindow: ActiveWindowInfo | null;
	nextAction: AgentAction | null;
	history: HistoryItem[];
	error: string | null;
	hoverCoords: { x: number; y: number } | null;
	setHoverCoords: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
};

function useLoopState(): AgentLoopState {
	const [goal, setGoal] = useState("");
	const [isLoopRunning, setIsLoopRunning] = useState(false);
	const [isAutoMode, setIsAutoMode] = useState(false);
	const [loopStatus, setLoopStatus] = useState<LoopStatus>("idle");
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

	const isAutoModeRef = useRef(isAutoMode);
	useEffect(() => {
		isAutoModeRef.current = isAutoMode;
	}, [isAutoMode]);

	return {
		goal,
		setGoal,
		isLoopRunning,
		setIsLoopRunning,
		isAutoMode,
		setIsAutoMode,
		loopStatus,
		setLoopStatus,
		currentScreenshot,
		setCurrentScreenshot,
		focusedWindow,
		setFocusedWindow,
		currentThought,
		setCurrentThought,
		nextAction,
		setNextAction,
		history,
		setHistory,
		error,
		setError,
		hoverCoords,
		setHoverCoords,
		loopRunningRef,
		isAutoModeRef,
	};
}

function useMouseHandlers(state: AgentLoopState) {
	const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = Math.floor(((e.clientX - rect.left) / rect.width) * 1000);
		const y = Math.floor(((e.clientY - rect.top) / rect.height) * 1000);
		state.setHoverCoords({ x, y });
	}, [state]);

	const handleImageMouseLeave = useCallback(() => {
		state.setHoverCoords(null);
	}, [state]);

	return { handleImageMouseMove, handleImageMouseLeave };
}

function useLoopActions(state: AgentLoopState) {
	const handleRefreshScreenshot = useCallback(async () => {
		try {
			const screenshotBase64 = await ComputerUseService.captureDisplay();
			state.setCurrentScreenshot(screenshotBase64);
			toast({ title: "Screen Captured", description: "Screenshot updated successfully." });
		} catch (err) {
			state.setError(String(err));
		}
	}, [state]);

	const handleApproveAction = async (action: AgentAction) => {
		await handleApprovedAction(state, runLoopStep, action);
	};

	const runLoopStep = async (shouldContinue: boolean) => {
		await runAgentLoopStep(state, handleApproveAction, shouldContinue);
	};

	const startAgentLoop = async () => {
		if (!state.goal.trim()) {
			toast({ title: "Input Required", description: "Please enter a goal first.", variant: "destructive" });
			return;
		}
		state.setIsLoopRunning(true);
		state.setError(null);
		await runLoopStep(true);
	};

	const stopAgentLoop = () => {
		state.setIsLoopRunning(false);
		state.setLoopStatus("idle");
	};

	const handleRejectAction = () => {
		state.setIsLoopRunning(false);
		state.setLoopStatus("idle");
		state.setNextAction(null);
		toast({ title: "Action Rejected", description: "Orchestration loop paused by user." });
	};

	return {
		handleRefreshScreenshot,
		handleApproveAction,
		startAgentLoop,
		stopAgentLoop,
		handleRejectAction,
	};
}

export function useAgentLoop(): UseAgentLoopReturn {
	const state = useLoopState();
	const { handleImageMouseMove, handleImageMouseLeave } = useMouseHandlers(state);
	const {
		handleRefreshScreenshot,
		handleApproveAction,
		startAgentLoop,
		stopAgentLoop,
		handleRejectAction,
	} = useLoopActions(state);

	return {
		goal: state.goal,
		setGoal: state.setGoal,
		isLoopRunning: state.isLoopRunning,
		isAutoMode: state.isAutoMode,
		setIsAutoMode: state.setIsAutoMode,
		loopStatus: state.loopStatus,
		currentScreenshot: state.currentScreenshot,
		focusedWindow: state.focusedWindow,
		currentThought: state.currentThought,
		nextAction: state.nextAction,
		history: state.history,
		error: state.error,
		hoverCoords: state.hoverCoords,
		startAgentLoop,
		stopAgentLoop,
		handleApproveAction,
		handleRejectAction,
		handleRefreshScreenshot,
		handleImageMouseMove,
		handleImageMouseLeave,
	};
}
