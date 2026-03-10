import { v4 as uuidv4 } from "uuid";
import {
	IPCMessageType,
	taskStartedMessageSchema,
} from "../packages/shared-ipc/src/schemas";

const mockTaskStarted = {
	messageId: `msg_${Date.now()}`,
	type: IPCMessageType.TASK_STARTED,
	timestamp: Date.now(),
	source: "nova" as const,
	target: "vibe" as const,
	version: "1.0.0",
	payload: {
		task_id: uuidv4(),
		task_type: "feature_development",
		title: "Implement Vibe-Justice Audit Layer",
		context: {
			priority: "high",
			reasoning: "Standardizing monorepo safety",
		},
	},
};

try {
	const validated = taskStartedMessageSchema.parse(mockTaskStarted);
	console.log("✅ Nova -> Bridge: Schema Validation Success!");
	console.log("Payload ID:", validated.payload.task_id);
} catch (error) {
	console.error("❌ Nova -> Bridge: Schema Validation Failed!");
	console.error(JSON.stringify(error, null, 2));
	process.exit(1);
}
