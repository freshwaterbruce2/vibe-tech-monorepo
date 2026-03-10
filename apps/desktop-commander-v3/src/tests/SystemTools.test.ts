/**
 * SystemTools Tests
 * Test suite for system information and control operations
 */

import si from "systeminformation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as System from "../SystemTools";

// Mock child_process with proper promisify support
vi.mock("node:child_process", () => ({
	exec: vi.fn((cmd: string, options: any, callback: any) => {
		if (typeof callback === "function") {
			callback(null, { stdout: "", stderr: "" });
		}
		return {} as any;
	}),
}));

import { exec } from "node:child_process";

// Mock systeminformation
vi.mock("systeminformation");

describe("SystemTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("setVolume", () => {
		it("should set volume up", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			await System.setVolume("up");

			expect(vi.mocked(exec)).toHaveBeenCalled();
			const command = vi.mocked(exec).mock.calls[0][0] as string;
			expect(command).toContain("powershell");
			expect(command).toContain("0xAF"); // VOLUME_UP key code
		});

		it("should set volume down", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			await System.setVolume("down");

			const command = vi.mocked(exec).mock.calls[0][0] as string;
			expect(command).toContain("0xAE"); // VOLUME_DOWN key code
		});

		it("should mute volume", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			await System.setVolume("mute");

			const command = vi.mocked(exec).mock.calls[0][0] as string;
			expect(command).toContain("0xAD"); // VOLUME_MUTE key code
		});

		it("should throw error for invalid action", async () => {
			await expect(System.setVolume("invalid" as any)).rejects.toThrow(
				"Unknown volume action",
			);
		});
	});

	describe("setBrightness", () => {
		it("should set brightness level", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "OK", stderr: "" });
				return {} as any;
			}) as any);

			await System.setBrightness(75);

			expect(vi.mocked(exec)).toHaveBeenCalled();
			const command = vi.mocked(exec).mock.calls[0][0] as string;
			expect(command).toContain("75");
		});

		it("should clamp brightness to 0-100 range", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "OK", stderr: "" });
				return {} as any;
			}) as any);

			await System.setBrightness(150);

			const command = vi.mocked(exec).mock.calls[0][0] as string;
			expect(command).toContain("100"); // Should be clamped to 100
		});

		it("should throw error if brightness control not supported", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "NO_SUPPORT", stderr: "" });
				return {} as any;
			}) as any);

			await expect(System.setBrightness(50)).rejects.toThrow("not supported");
		});
	});

	describe("getBrightness", () => {
		it("should get current brightness level", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "75", stderr: "" });
				return {} as any;
			}) as any);

			const result = await System.getBrightness();

			expect(result).toBe(75);
		});

		it("should throw error if brightness control not supported", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "-1", stderr: "" });
				return {} as any;
			}) as any);

			await expect(System.getBrightness()).rejects.toThrow("not supported");
		});
	});

	describe("getBattery", () => {
		it("should return battery information", async () => {
			vi.mocked(si.battery).mockResolvedValue({
				hasBattery: true,
				percent: 85,
				isCharging: false,
				timeRemaining: 120,
			} as any);

			const result = await System.getBattery();

			expect(result.hasBattery).toBe(true);
			expect(result.percent).toBe(85);
			expect(result.isCharging).toBe(false);
			expect(result.timeRemaining).toBe(120);
		});

		it("should handle devices without battery", async () => {
			vi.mocked(si.battery).mockResolvedValue({
				hasBattery: false,
				percent: 0,
				isCharging: false,
				timeRemaining: -1,
			} as any);

			const result = await System.getBattery();

			expect(result.hasBattery).toBe(false);
			expect(result.timeRemaining).toBeNull(); // -1 converted to null
		});
	});

	describe("getNetwork", () => {
		it("should return network information", async () => {
			vi.mocked(si.networkInterfaces).mockResolvedValue([
				{
					iface: "eth0",
					ip4: "192.168.1.100",
					ip6: "fe80::1",
					mac: "00:11:22:33:44:55",
					type: "wired",
					speed: 1000,
				},
			] as any);

			vi.mocked(si.networkConnections).mockResolvedValue([
				{ protocol: "tcp", localAddress: "127.0.0.1" },
				{ protocol: "tcp", localAddress: "192.168.1.100" },
			] as any);

			const result = await System.getNetwork();

			expect(result.interfaces).toHaveLength(1);
			expect(result.interfaces[0].name).toBe("eth0");
			expect(result.interfaces[0].ip4).toBe("192.168.1.100");
			expect(result.connections.active).toBe(2);
		});

		it("should handle single interface (not array)", async () => {
			vi.mocked(si.networkInterfaces).mockResolvedValue({
				iface: "wlan0",
				ip4: "192.168.1.50",
				ip6: "",
				mac: "00:11:22:33:44:66",
				type: "wireless",
				speed: null,
			} as any);

			vi.mocked(si.networkConnections).mockResolvedValue([]);

			const result = await System.getNetwork();

			expect(result.interfaces).toHaveLength(1);
			expect(result.interfaces[0].name).toBe("wlan0");
		});
	});

	describe("getDisks", () => {
		it("should return disk usage information", async () => {
			vi.mocked(si.fsSize).mockResolvedValue([
				{
					fs: "C:",
					mount: "C:",
					type: "NTFS",
					size: 500000000000,
					used: 300000000000,
					available: 200000000000,
					use: 60,
				},
				{
					fs: "D:",
					mount: "D:",
					type: "NTFS",
					size: 1000000000000,
					used: 100000000000,
					available: 900000000000,
					use: 10,
				},
			] as any);

			const result = await System.getDisks();

			expect(result.disks).toHaveLength(2);
			expect(result.disks[0].name).toBe("C:");
			expect(result.disks[0].usedPercent).toBe(60);
			expect(result.disks[1].name).toBe("D:");
			expect(result.disks[1].usedPercent).toBe(10);
		});
	});

	describe("getEnvironmentVariable", () => {
		it("should return environment variable value", async () => {
			process.env.TEST_VAR = "test_value";

			const result = await System.getEnvironmentVariable("TEST_VAR");

			expect(result).toBe("test_value");

			delete process.env.TEST_VAR;
		});

		it("should return null for undefined variable", async () => {
			const result = await System.getEnvironmentVariable("UNDEFINED_VAR");

			expect(result).toBeNull();
		});
	});

	describe("getEnvironmentVariables", () => {
		it("should return all environment variables when no prefix", async () => {
			process.env.TEST1 = "value1";
			process.env.TEST2 = "value2";

			const result = await System.getEnvironmentVariables();

			expect(result).toHaveProperty("TEST1", "value1");
			expect(result).toHaveProperty("TEST2", "value2");

			delete process.env.TEST1;
			delete process.env.TEST2;
		});

		it("should filter by prefix", async () => {
			process.env.DC_VAR1 = "value1";
			process.env.DC_VAR2 = "value2";
			process.env.OTHER_VAR = "value3";

			const result = await System.getEnvironmentVariables("DC_");

			expect(result).toHaveProperty("DC_VAR1", "value1");
			expect(result).toHaveProperty("DC_VAR2", "value2");
			expect(result).not.toHaveProperty("OTHER_VAR");

			delete process.env.DC_VAR1;
			delete process.env.DC_VAR2;
			delete process.env.OTHER_VAR;
		});
	});

	describe("runPowerShell", () => {
		it("should run allowed PowerShell command", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "result", stderr: "" });
				return {} as any;
			}) as any);

			const result = await System.runPowerShell("Get-Date");

			expect(result.success).toBe(true);
			expect(result.output).toBe("result");
		});

		it("should block disallowed PowerShell commands", async () => {
			await expect(
				System.runPowerShell("Remove-Item -Force C:\\"),
			).rejects.toThrow("Command not allowed");
		});

		it("should return error for failed commands", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(new Error("Command failed"), { stdout: "", stderr: "error" });
				return {} as any;
			}) as any);

			const result = await System.runPowerShell("Get-Process");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Command failed");
		});

		it("should allow Get-Process command", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "processes", stderr: "" });
				return {} as any;
			}) as any);

			const result = await System.runPowerShell(
				"Get-Process | Select-Object Name",
			);

			expect(result.success).toBe(true);
		});
	});

	describe("runPowerShellUnsafe", () => {
		it("should throw error if unsafe execution is disabled", async () => {
			delete process.env.DC_ALLOW_UNSAFE_POWERSHELL;

			await expect(System.runPowerShellUnsafe("any command")).rejects.toThrow(
				"Unsafe PowerShell is disabled",
			);
		});

		it("should run command if unsafe execution is enabled", async () => {
			process.env.DC_ALLOW_UNSAFE_POWERSHELL = "1";

			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "unsafe result", stderr: "" });
				return {} as any;
			}) as any);

			const result = await System.runPowerShellUnsafe("any command");

			expect(result.success).toBe(true);
			expect(result.output).toBe("unsafe result");

			delete process.env.DC_ALLOW_UNSAFE_POWERSHELL;
		});

		it("should respect custom timeout", async () => {
			process.env.DC_ALLOW_UNSAFE_POWERSHELL = "1";

			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(options.timeout).toBe(60000);
				callback(null, { stdout: "result", stderr: "" });
				return {} as any;
			}) as any);

			await System.runPowerShellUnsafe("command", { timeoutMs: 60000 });

			delete process.env.DC_ALLOW_UNSAFE_POWERSHELL;
		});
	});
});
