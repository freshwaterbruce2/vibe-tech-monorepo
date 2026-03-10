import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
	invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("AgentService security hardening", () => {
	beforeEach(() => {
		mockInvoke.mockReset();
	});

	it("passes explicit approval state to execute_code", async () => {
		mockInvoke.mockResolvedValueOnce("ok");
		const { AgentService } = await import("./AgentService");

		await AgentService.executeCode("python", "print('ok')", true);

		expect(mockInvoke).toHaveBeenCalledWith("execute_code", {
			language: "python",
			code: "print('ok')",
			approved: true,
		});
	});

	it("defaults execute_code approval to false", async () => {
		mockInvoke.mockResolvedValueOnce("ok");
		const { AgentService } = await import("./AgentService");

		await AgentService.executeCode("python", "print('ok')");

		expect(mockInvoke).toHaveBeenCalledWith("execute_code", {
			language: "python",
			code: "print('ok')",
			approved: false,
		});
	});
});
