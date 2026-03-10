/**
 * PermissionManager Tests
 * Test suite for permission system
 */

import * as fs from "fs";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPermissionManager, PermissionManager } from "../PermissionManager";

// Mock dependencies
vi.mock("fs");
vi.mock("../Logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

describe("PermissionManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("constructor and config loading", () => {
		it("should load config from MCP_CONFIG.json", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_get_cpu", "dc_get_mem", "dc_list_processes"],
						alwaysAsk: ["dc_delete_file", "dc_terminate_app"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(fs.readFileSync).toHaveBeenCalled();
			expect(manager.isAutoApproved("dc_get_cpu")).toBe(true);
			expect(manager.isAutoApproved("dc_delete_file")).toBe(false); // In alwaysAsk
		});

		it("should handle missing config file gracefully", () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			const manager = new PermissionManager();

			// Should not throw error
			expect(manager.isAutoApproved("any_command")).toBe(false);
		});

		it("should handle malformed JSON gracefully", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue("invalid json {");

			const manager = new PermissionManager();

			// Should not throw error
			expect(manager.isAutoApproved("any_command")).toBe(false);
		});

		it("should accept custom config path", () => {
			const customPath = "C:\\custom\\config.json";
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["test_command"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager(customPath);

			expect(fs.readFileSync).toHaveBeenCalledWith(customPath, "utf-8");
		});
	});

	describe("isAutoApproved", () => {
		it("should return true for auto-approved commands", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_get_cpu", "dc_get_mem"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("dc_get_cpu")).toBe(true);
			expect(manager.isAutoApproved("dc_get_mem")).toBe(true);
		});

		it("should return false for non-approved commands", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_get_cpu"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("dc_delete_file")).toBe(false);
		});

		it("should prioritize alwaysAsk over autoApprove", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_delete_file"],
						alwaysAsk: ["dc_delete_file"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("dc_delete_file")).toBe(false);
		});

		it("should support wildcard auto-approval", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["*"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("any_command")).toBe(true);
			expect(manager.isAutoApproved("another_command")).toBe(true);
		});

		it("should support pattern matching with wildcards", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_*"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("dc_get_cpu")).toBe(true);
			expect(manager.isAutoApproved("dc_list_processes")).toBe(true);
			expect(manager.isAutoApproved("other_command")).toBe(false);
		});

		it("should handle pattern matching at end of string", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["*_safe"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("command_safe")).toBe(true);
			expect(manager.isAutoApproved("another_safe")).toBe(true);
			expect(manager.isAutoApproved("unsafe")).toBe(false);
		});
	});

	describe("getAutoApproved", () => {
		it("should return list of auto-approved commands", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_get_cpu", "dc_get_mem", "dc_*"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			const approved = manager.getAutoApproved();

			expect(approved).toContain("dc_get_cpu");
			expect(approved).toContain("dc_get_mem");
			expect(approved).toContain("dc_*");
		});
	});

	describe("getAlwaysAsk", () => {
		it("should return list of always-ask commands", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						alwaysAsk: ["dc_delete_file", "dc_terminate_app"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			const alwaysAsk = manager.getAlwaysAsk();

			expect(alwaysAsk).toContain("dc_delete_file");
			expect(alwaysAsk).toContain("dc_terminate_app");
		});
	});

	describe("reload", () => {
		it("should reload config from disk", () => {
			const initialConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_get_cpu"],
					},
				},
			};

			const updatedConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_get_cpu", "dc_get_mem"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValueOnce(
				JSON.stringify(initialConfig),
			);

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("dc_get_mem")).toBe(false);

			// Update mock to return new config
			vi.mocked(fs.readFileSync).mockReturnValueOnce(
				JSON.stringify(updatedConfig),
			);

			manager.reload();

			expect(manager.isAutoApproved("dc_get_mem")).toBe(true);
		});

		it("should clear previous config on reload", () => {
			const initialConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_old_command"],
					},
				},
			};

			const updatedConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: ["dc_new_command"],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(initialConfig))
				.mockReturnValueOnce(JSON.stringify(updatedConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("dc_old_command")).toBe(true);

			manager.reload();

			expect(manager.isAutoApproved("dc_old_command")).toBe(false);
			expect(manager.isAutoApproved("dc_new_command")).toBe(true);
		});
	});

	describe("getPermissionManager singleton", () => {
		it("should return same instance on multiple calls", () => {
			const manager1 = getPermissionManager();
			const manager2 = getPermissionManager();

			expect(manager1).toBe(manager2);
		});

		it("should create instance on first call", () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			const manager = getPermissionManager();

			expect(manager).toBeInstanceOf(PermissionManager);
		});
	});

	describe("edge cases", () => {
		it("should handle empty autoApprove array", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {
						autoApprove: [],
					},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("any_command")).toBe(false);
			expect(manager.getAutoApproved()).toHaveLength(0);
		});

		it("should handle missing autoApprove key", () => {
			const mockConfig = {
				mcpServers: {
					"desktop-commander": {},
				},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("any_command")).toBe(false);
		});

		it("should handle missing desktop-commander config", () => {
			const mockConfig = {
				mcpServers: {},
			};

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

			const manager = new PermissionManager();

			expect(manager.isAutoApproved("any_command")).toBe(false);
		});
	});
});
