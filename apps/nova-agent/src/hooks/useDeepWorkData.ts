import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { DeepWorkSession, DeepWorkStats } from "../types/deepWork";

interface DeepWorkData {
	stats: DeepWorkStats;
	sessions: DeepWorkSession[];
}

export function useDeepWorkData() {
	const [stats, setStats] = useState<DeepWorkStats | null>(null);
	const [sessions, setSessions] = useState<DeepWorkSession[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await invoke<DeepWorkData>("get_deep_work_data");
			setSessions(data.sessions);
			setStats(data.stats);
		} catch (err) {
			console.error("Failed to load deep work data:", err);
			setError("Failed to load deep work data");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	return { stats, sessions, isLoading, error, refetch: fetchData };
}
