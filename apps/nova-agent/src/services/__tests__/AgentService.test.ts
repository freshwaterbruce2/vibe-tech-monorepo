import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentService } from "../AgentService";

// Mock Tauri invoke
const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
	invoke: (...args: any[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
	listen: (...args: any[]) => mockListen(...args),
}));

describe("AgentService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should chat with agent successfully", async () => {
		mockInvoke.mockResolvedValue("Hello user");
		const response = await AgentService.chat("Hello");
		expect(mockInvoke).toHaveBeenCalledWith("chat_with_agent", {
			message: "Hello",
			projectId: undefined,
		});
		expect(response).toBe("Hello user");
	});

	it("should get status successfully", async () => {
		const mockStatus = {
			memory_count: 5,
			capabilities: [],
			active_conversations: [],
		};
		mockInvoke.mockResolvedValue(mockStatus);
		const status = await AgentService.getStatus();
		expect(mockInvoke).toHaveBeenCalledWith("get_agent_status");
		expect(status).toEqual(mockStatus);
	});

	it("should send IPC message", async () => {
		mockInvoke.mockResolvedValue(undefined);
		const msg = { type: "test" };
		await AgentService.sendIpcMessage(msg);
		expect(mockInvoke).toHaveBeenCalledWith("send_ipc_message", {
			message: msg,
		});
	});

	it("should listen to IPC messages", async () => {
		const mockUnlisten = vi.fn();
		mockListen.mockResolvedValue(mockUnlisten);
		const callback = vi.fn();

		const unlisten = await AgentService.onIpcMessage(callback);

		expect(mockListen).toHaveBeenCalledWith(
			"ipc-message",
			expect.any(Function),
		);
		expect(unlisten).toBe(mockUnlisten);
	});

	it("should search web", async () => {
		const mockResults = [
			{ title: "Test", link: "https://test.com", snippet: "Test snippet" },
		];
		mockInvoke.mockResolvedValue(mockResults);
		const results = await AgentService.searchWeb("test query");
		expect(mockInvoke).toHaveBeenCalledWith("web_search", {
			query: "test query",
		});
		expect(results).toEqual(mockResults);
	});
});
