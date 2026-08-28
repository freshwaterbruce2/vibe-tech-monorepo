/**
 * MediaTools Tests
 * Test suite for camera enumeration, screen recording, and camera capture
 */

import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Create mock for execFileAsync (replaces promisify(execFile) in source)
const mockExecFileAsync = vi.fn();

// Mock the modules
vi.mock("node:util", () => ({
	promisify: vi.fn(() => mockExecFileAsync),
}));

vi.mock("node:fs", () => ({
	default: {
		existsSync: vi.fn(),
		mkdirSync: vi.fn(),
	},
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
}));

vi.mock("../PathValidator", () => ({
	validatePath: vi.fn(),
}));

// Import Media after mocks are set up
const Media = await import("../MediaTools");

describe("MediaTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Setup default fs mocks
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
	});

	describe("listCameras", () => {
		it("should list available cameras", async () => {
			const mockCameras = [
				{
					FriendlyName: "Integrated Webcam",
					InstanceId: "USB\\VID_1234&PID_5678",
				},
				{
					FriendlyName: "External USB Camera",
					InstanceId: "USB\\VID_ABCD&PID_EFGH",
				},
			];

			mockExecFileAsync.mockResolvedValue({
				stdout: JSON.stringify(mockCameras),
				stderr: "",
			});

			const cameras = await Media.listCameras();

			expect(cameras).toHaveLength(2);
			expect(cameras[0].name).toBe("Integrated Webcam");
			expect(cameras[0].instanceId).toBe("USB\\VID_1234&PID_5678");
			expect(cameras[1].name).toBe("External USB Camera");
		});

		it("should handle single camera result", async () => {
			const mockCamera = {
				FriendlyName: "Single Camera",
				InstanceId: "USB\\VID_1234",
			};

			mockExecFileAsync.mockResolvedValue({
				stdout: JSON.stringify(mockCamera),
				stderr: "",
			});

			const cameras = await Media.listCameras();

			expect(cameras).toHaveLength(1);
			expect(cameras[0].name).toBe("Single Camera");
		});

		it("should handle no cameras found", async () => {
			mockExecFileAsync.mockResolvedValue({
				stdout: "",
				stderr: "",
			});

			const cameras = await Media.listCameras();

			expect(cameras).toHaveLength(0);
		});

		it("should filter out cameras without names", async () => {
			const mockCameras = [
				{ FriendlyName: "Valid Camera", InstanceId: "USB\\VID_1234" },
				{ InstanceId: "USB\\VID_5678" }, // No name
				{ FriendlyName: "" }, // Empty name
			];

			mockExecFileAsync.mockResolvedValue({
				stdout: JSON.stringify(mockCameras),
				stderr: "",
			});

			const cameras = await Media.listCameras();

			expect(cameras).toHaveLength(1);
			expect(cameras[0].name).toBe("Valid Camera");
		});
	});

	describe("recordScreen", () => {
		it("should record screen with default settings", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			const result = await Media.recordScreen({
				durationSeconds: 10,
			});

			expect(result).toMatch(/D:\\recordings\\screen-record-.*\.mp4/);
			expect(mockExecFileAsync).toHaveBeenCalled();
			const callArgs = mockExecFileAsync.mock.calls[0][1] as string[];
			expect(callArgs).toContain("-f");
			expect(callArgs).toContain("gdigrab");
			expect(callArgs).toContain("-framerate");
			expect(callArgs).toContain("15"); // Default FPS
			expect(callArgs).toContain("-t");
			expect(callArgs).toContain("10");
		});

		it("should reject invalid duration", async () => {
			await expect(
				Media.recordScreen({ durationSeconds: 0 }),
			).rejects.toThrow("durationSeconds must be greater than 0");

			await expect(
				Media.recordScreen({ durationSeconds: -5 }),
			).rejects.toThrow("durationSeconds must be greater than 0");
		});

		it("should support custom FPS", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			await Media.recordScreen({
				durationSeconds: 10,
				fps: 30,
			});

			const callArgs = mockExecFileAsync.mock.calls[0][1] as string[];
			expect(callArgs).toContain("30");
		});

		it("should clamp FPS to valid range", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			// Test upper bound
			await Media.recordScreen({
				durationSeconds: 10,
				fps: 100,
			});

			let callArgs = mockExecFileAsync.mock.calls[0][1] as string[];
			expect(callArgs).toContain("60"); // Max FPS

			vi.clearAllMocks();
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			// Test lower bound
			await Media.recordScreen({
				durationSeconds: 10,
				fps: -5,
			});

			callArgs = mockExecFileAsync.mock.calls[0][1] as string[];
			expect(callArgs).toContain("1"); // Min FPS
		});

		it("should support custom directory and filename", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			const result = await Media.recordScreen({
				durationSeconds: 10,
				directory: "D:\\test",
				filename: "my-recording",
			});

			expect(result).toBe("D:\\test\\my-recording.mp4");
		});

		it("should support custom output path", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			const customPath = "D:\\custom\\path\\recording.mp4";
			const result = await Media.recordScreen({
				durationSeconds: 10,
				outputPath: customPath,
			});

			expect(result).toBe(customPath);
		});

		it("should throw error if ffmpeg not found", async () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);
			mockExecFileAsync.mockRejectedValue(new Error("Command not found"));

			await expect(
				Media.recordScreen({ durationSeconds: 10 }),
			).rejects.toThrow();
		});
	});

	describe("captureCamera", () => {
		beforeEach(() => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
		});

		it("should capture photo from camera (no duration)", async () => {
			// Mock listCameras
			mockExecFileAsync.mockResolvedValueOnce({
				stdout: JSON.stringify({
					FriendlyName: "Test Camera",
					InstanceId: "USB\\VID_1234",
				}),
				stderr: "",
			});
			// Mock ffmpeg capture
			mockExecFileAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

			const result = await Media.captureCamera({});

			expect(result).toMatch(/D:\\recordings\\camera-shot-.*\.png/);
			expect(mockExecFileAsync).toHaveBeenCalledTimes(2); // listCameras + ffmpeg
		});

		it("should record video from camera (with duration)", async () => {
			// Mock listCameras
			mockExecFileAsync.mockResolvedValueOnce({
				stdout: JSON.stringify({
					FriendlyName: "Test Camera",
					InstanceId: "USB\\VID_1234",
				}),
				stderr: "",
			});
			// Mock ffmpeg capture
			mockExecFileAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

			const result = await Media.captureCamera({
				durationSeconds: 10,
			});

			expect(result).toMatch(/D:\\recordings\\camera-record-.*\.mp4/);
			const callArgs = mockExecFileAsync.mock.calls[1][1] as string[];
			expect(callArgs).toContain("-t");
			expect(callArgs).toContain("10");
		});

		it("should use specified camera device", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			await Media.captureCamera({
				device: "Specific Camera",
			});

			expect(mockExecFileAsync).toHaveBeenCalledTimes(1); // Only ffmpeg, no listCameras
			const callArgs = mockExecFileAsync.mock.calls[0][1] as string[];
			expect(callArgs).toContain("video=Specific Camera");
		});

		it("should throw error if no camera found", async () => {
			// Mock listCameras returning empty
			mockExecFileAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

			await expect(Media.captureCamera({})).rejects.toThrow(
				"No camera device found",
			);
		});

		it("should escape device name for ffmpeg", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			await Media.captureCamera({
				device: 'Camera "with" quotes',
			});

			const callArgs = mockExecFileAsync.mock.calls[0][1] as string[];
			const deviceArg = callArgs.find((arg) => arg.startsWith("video="));
			expect(deviceArg).not.toContain('"');
		});

		it("should support custom directory and filename", async () => {
			mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

			const result = await Media.captureCamera({
				device: "Test Camera",
				directory: "D:\\test",
				filename: "my-capture",
			});

			expect(result).toBe("D:\\test\\my-capture.png");
		});
	});
});
