import {
	type CommandResultPayload,
	IPCMessageType,
} from "@vibetech/shared-ipc";
import { CommandExecutor } from "./CommandExecutor.js";
import { IPCClient } from "./IPCClient.js";
import { logger } from "./Logger.js";

const executor = new CommandExecutor();

const client = new IPCClient(
	"ws://localhost:5004",
	async (payload, messageId) => {
		try {
			logger.debug("Processing command request:", payload);
			const result = await executor.execute(payload);

			// Send success response
			client.send({
				type: IPCMessageType.COMMAND_RESULT,
				payload: {
					commandId: messageId,
					success: true,
					result: result,
				} as CommandResultPayload,
				timestamp: Date.now(),
				messageId: `res-${Date.now()}`,
				source: "desktop-commander-v3",
				version: "2.0.0",
			});
		} catch (error) {
			// Send error response
			client.send({
				type: IPCMessageType.COMMAND_RESULT,
				payload: {
					commandId: messageId,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				} as CommandResultPayload,
				timestamp: Date.now(),
				messageId: `err-${Date.now()}`,
				source: "desktop-commander-v3",
				version: "2.0.0",
			});
		}
	},
);

logger.info("Starting Desktop Commander V3 IPC Bridge Client...");
client.connect();

// Handle shutdown
process.on("SIGINT", () => {
	logger.info("Shutting down...");
	process.exit(0);
});
