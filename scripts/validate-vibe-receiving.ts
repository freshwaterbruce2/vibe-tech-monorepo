import { ipcMessageSchema } from "../packages/shared-ipc/src/schemas";

// Simulating a raw JSON string coming over the socket/pipe
const rawIncoming = `{"messageId":"test-123","type":"task_started","timestamp":1735158355,"source":"nova","payload":{"task_id":"justice-001","task_type":"audit","title":"Safety Check"}}`;

function receiveMessage(raw: string) {
	const parsed = JSON.parse(raw);
	const result = ipcMessageSchema.safeParse(parsed);

	if (result.success) {
		if (result.data.type === "task_started") {
			console.log(
				`✅ Vibe Studio: Received valid task [${result.data.payload.title}]`,
			);
		}
	} else {
		console.error("❌ Vibe Studio: Received MALFORMED message!");
		console.error(JSON.stringify(result.error.flatten(), null, 2));
	}
}

receiveMessage(rawIncoming);
