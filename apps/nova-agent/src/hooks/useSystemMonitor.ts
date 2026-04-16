// import { invoke } from "@tauri-apps/api/core"; // Reserved for future use
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";

export interface SystemInfo {
	cpu: {
		currentLoad: number;
		avgLoad: number;
	};
	mem: {
		total: number;
		free: number;
		used: number;
		active: number;
		available: number;
	};
	os: {
		platform: string;
		distro: string;
		release: string;
		arch: string;
	};
}

export const useSystemMonitor = () => {
	const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
	const [isMonitoring, setIsMonitoring] = useState(false);

	// Listen for IPC messages from the backend
	useEffect(() => {
		const unlisten = listen("ipc-message", (event) => {
			const msg = event.payload as { type?: string; payload?: { result?: { cpu?: SystemInfo['cpu']; mem?: SystemInfo['mem']; os?: SystemInfo['os'] } } };

			// Check if this is a command response from desktop-commander-v3
			if (msg.type === "command_result" && msg.payload?.result?.cpu) {
				// It seems we got a system info payload
				const result = msg.payload.result;
				setSystemInfo({
					cpu: result.cpu as SystemInfo['cpu'],
					mem: result.mem as SystemInfo['mem'],
					os: result.os as SystemInfo['os'],
				});
			}
		});

		return () => {
			void unlisten.then((f) => f());
		};
	}, []);

	// Function to trigger a manual update (though backend does this automatically now)
	const refreshSystemInfo = useCallback(async () => {
		// We can invoke the same command request logic from frontend if needed
		// But since main.rs is looping, we might just wait.
		// For now, let's rely on the backend loop we set up in Phase 3.
		setIsMonitoring(true);
	}, []);

	return { systemInfo, isMonitoring, refreshSystemInfo };
};
