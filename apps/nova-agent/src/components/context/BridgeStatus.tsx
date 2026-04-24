import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "sonner";

export function BridgeStatus() {
	const [status] = useState("Connecting...");
	const [lastSync, setLastSync] = useState("Never");

	const handleSync = async () => {
		try {
			await invoke("log_activity", {
				activityType: "manual_sync",
				details: "User requested manual sync",
			});
			setLastSync(new Date().toLocaleTimeString());
			toast.success("Sync initiated");
		} catch (e) {
			console.error("Sync failed:", e);
			toast.error("Sync failed to start");
		}
	};

	return (
		<div className="border border-white/10 bg-black/40 rounded-lg p-4">
			<h3 className="text-lg font-semibold mb-3 text-white">
				Deep Code Editor Bridge
			</h3>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-medium text-gray-300">Status:</span>
					<span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-sm">
						{status}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="font-medium text-gray-300">Last Sync:</span>
					<span className="text-gray-400">{lastSync}</span>
				</div>
				<div className="mt-4 flex gap-2">
					<button
						onClick={() => {
							void handleSync();
						}}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
					>
						Sync Now
					</button>
					<button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm">
						Open File
					</button>
				</div>
			</div>
		</div>
	);
}
