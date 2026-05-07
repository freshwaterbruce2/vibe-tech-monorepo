import open from "open";
import * as Media from "../MediaTools.js";
import * as Web from "../WebTools.js";
import { ToolAnnotations } from "./types.js";


function validateHttpUrl(url: string): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("Invalid URL format");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error("Only HTTP/HTTPS URLs allowed");
	}
	return parsed.toString();
}

export const mediaWebTools: Array<{
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations?: ToolAnnotations;
}> = [
	// ----------------------
	// Media & Recording
	// ----------------------
	{
		name: "dc_list_cameras",
		description: `List available camera devices on Windows 11. Returns camera names and instance IDs.

Uses Windows PnP (Plug and Play) device enumeration via PowerShell.

Returns: Array of camera devices with name and optional instanceId
Example: [{ name: "Integrated Webcam", instanceId: "USB\\VID_..." }]

Use Cases:
- Enumerate cameras before recording
- Verify camera availability
- Get device names for dc_capture_camera

Error Cases:
- No cameras found → Returns empty array []
- PowerShell execution failure → Returns error`,
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_record_screen",
		description: `Record screen video using ffmpeg. Captures entire desktop including all monitors.

REQUIRES: ffmpeg installed and in PATH (or set FFMPEG_PATH env var)

Parameters:
- durationSeconds: Recording duration (1-3600, required)
- fps: Frames per second (1-60, default 15, higher = larger files)
- directory: Save directory (default D:\\recordings)
- filename: Custom filename without extension (optional)
- outputPath: Full output path (overrides directory/filename)

Codec: H.264 (yuv420p) for broad compatibility
Output Format: MP4

Examples:
- durationSeconds: 10, fps: 30 → Record 10s at 30fps
- durationSeconds: 60, filename: "demo" → Record 1min to D:\\recordings\\demo.mp4

Performance:
- 15fps: ~5MB/min
- 30fps: ~10MB/min
- 60fps: ~20MB/min

Returns: { path: "D:\\recordings\\screen-record-2026-02-19-14-30-45.mp4" }`,
		inputSchema: {
			type: "object",
			properties: {
				durationSeconds: {
					type: "number",
					description: "Recording duration in seconds (1-3600)",
					minimum: 1,
					maximum: 3600,
				},
				fps: {
					type: "number",
					description: "Frames per second (1-60, default 15)",
					minimum: 1,
					maximum: 60,
					default: 15,
				},
				directory: {
					type: "string",
					description: "Save directory (default D:\\recordings)",
					default: "D:\\recordings",
				},
				filename: {
					type: "string",
					description: "Custom filename without extension (optional)",
				},
				outputPath: {
					type: "string",
					description: "Full output path (overrides directory/filename)",
				},
			},
			required: ["durationSeconds"],
		},
	},
	{
		name: "dc_capture_camera",
		description: `Capture photo or video from camera using ffmpeg. Supports both single frame (photo) and timed recording (video).

REQUIRES: ffmpeg installed and in PATH (or set FFMPEG_PATH env var)

Parameters:
- device: Camera name from dc_list_cameras (optional, uses first camera if omitted)
- durationSeconds: Video duration in seconds (omit for single photo)
- directory: Save directory (default D:\\recordings)
- filename: Custom filename without extension (optional)
- outputPath: Full output path (overrides directory/filename)

Modes:
- Photo: Omit durationSeconds → Captures single frame as PNG
- Video: Set durationSeconds → Records video as MP4

Examples:
- device: "Integrated Webcam" → Photo from specific camera
- device: "USB Camera", durationSeconds: 10 → 10s video clip
- durationSeconds: 5, filename: "test-cam" → 5s video to D:\\recordings\\test-cam.mp4

Error Cases:
- No camera found → Use dc_list_cameras to enumerate
- ffmpeg not found → Install ffmpeg or set FFMPEG_PATH
- Camera in use → Close other applications using camera

Returns: { path: "D:\\recordings\\camera-shot-2026-02-19-14-30-45.png" }`,
		inputSchema: {
			type: "object",
			properties: {
				device: {
					type: "string",
					description: "Camera name from dc_list_cameras (optional, uses first if omitted)",
				},
				durationSeconds: {
					type: "number",
					description: "Video duration in seconds (omit for photo)",
					minimum: 1,
					maximum: 3600,
				},
				directory: {
					type: "string",
					description: "Save directory (default D:\\recordings)",
					default: "D:\\recordings",
				},
				filename: {
					type: "string",
					description: "Custom filename without extension (optional)",
				},
				outputPath: {
					type: "string",
					description: "Full output path (overrides directory/filename)",
				},
			},
		},
	},

	// ----------------------
	// Web & HTTP
	// ----------------------
	{
		name: "dc_fetch_url",
		description: `Fetch HTTP/HTTPS URL content using Node.js built-in http/https modules. Lightweight alternative to curl/wget.

Security: Only HTTP/HTTPS URLs allowed (no file://, ftp://, etc.)

Parameters:
- url: HTTP/HTTPS URL (required)
- method: GET (default) or HEAD
- headers: Custom HTTP headers (optional, e.g., { "Authorization": "Bearer token" })
- timeoutMs: Request timeout in milliseconds (1000-60000, default 15000)
- maxBytes: Maximum response size (1024-10MB, default 1MB)

Features:
- Automatic timeout handling
- Response size limiting (prevents memory issues)
- Truncation flag if response exceeds maxBytes

Examples:
- url: "https://api.example.com/data" → Fetch JSON API
- url: "https://example.com", method: "HEAD" → Check if URL exists
- url: "https://api.github.com/repos/owner/repo", headers: { "Accept": "application/json" }

Returns: { ok: true/false, status: 200, statusText: "OK", headers: {...}, body: "...", truncated: false }

Error Cases:
- Invalid URL → "Invalid URL format"
- Timeout → "Request timed out"
- Non-HTTP URL → "Only HTTP/HTTPS URLs allowed"`,
		inputSchema: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "HTTP/HTTPS URL to fetch",
					minLength: 1,
				},
				method: {
					type: "string",
					enum: ["GET", "HEAD"],
					description: "HTTP method (default GET)",
					default: "GET",
				},
				headers: {
					type: "object",
					description: "Custom HTTP headers (optional)",
				},
				timeoutMs: {
					type: "number",
					description: "Request timeout in milliseconds (default 15000)",
					minimum: 1000,
					maximum: 60000,
					default: 15000,
				},
				maxBytes: {
					type: "number",
					description: "Max response size in bytes (default 1MB)",
					minimum: 1024,
					maximum: 10485760,
					default: 1048576,
				},
			},
			required: ["url"],
		},
		annotations: { openWorldHint: true },
	},
	{
		name: "dc_web_search",
		description: `Perform web search using DuckDuckGo HTML scraping. Returns organic search results without API key.

Engine: DuckDuckGo (privacy-focused, no tracking)
Method: HTML scraping (no API key required)

Parameters:
- query: Search query (required)
- maxResults: Maximum results to return (1-20, default 8)
- engine: Search engine (only "duckduckgo" supported)

Features:
- Privacy-focused (no user tracking)
- No API key required
- Title and URL extraction
- HTML entity decoding
- DuckDuckGo redirect unwrapping

Examples:
- query: "TypeScript MCP server" → Find MCP documentation
- query: "Windows 11 ffmpeg install", maxResults: 5 → Installation guides
- query: "site:github.com claude mcp" → Search specific site

Returns: [{ title: "...", url: "https://..." }, ...]

Limitations:
- HTML scraping (may break if DuckDuckGo changes layout)
- Max 20 results per query
- No advanced search operators (use query string syntax)
- Rate limiting possible with excessive requests

Error Cases:
- Network failure → "Request timed out"
- Parse failure → Returns empty array []`,
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query",
					minLength: 1,
				},
				maxResults: {
					type: "number",
					description: "Max results to return (1-20, default 8)",
					minimum: 1,
					maximum: 20,
					default: 8,
				},
				engine: {
					type: "string",
					enum: ["duckduckgo"],
					description: "Search engine (only duckduckgo supported)",
					default: "duckduckgo",
				},
			},
			required: ["query"],
		},
		annotations: { openWorldHint: true },
	},
	{
		name: "dc_open_url",
		description: "Open a URL in default browser (HTTP/HTTPS only)",
		inputSchema: {
			type: "object",
			properties: { url: { type: "string", description: "URL to open" } },
			required: ["url"],
		},
		annotations: { openWorldHint: true },
	},
];

export const mediaWebHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
	dc_list_cameras: async () => Media.listCameras(),
	dc_record_screen: async (a) =>
		Media.recordScreen({
			durationSeconds: Number(a.durationSeconds),
			fps: a.fps ? Number(a.fps) : undefined,
			directory: a.directory ? String(a.directory) : undefined,
			filename: a.filename ? String(a.filename) : undefined,
			outputPath: a.outputPath ? String(a.outputPath) : undefined,
		}),
	dc_capture_camera: async (a) =>
		Media.captureCamera({
			device: a.device ? String(a.device) : undefined,
			durationSeconds: a.durationSeconds
				? Number(a.durationSeconds)
				: undefined,
			directory: a.directory ? String(a.directory) : undefined,
			filename: a.filename ? String(a.filename) : undefined,
			outputPath: a.outputPath ? String(a.outputPath) : undefined,
		}),
	dc_fetch_url: async (a) =>
		Web.fetchUrl(String(a.url), {
			method: a.method ? (a.method as "GET" | "HEAD") : undefined,
			headers: a.headers as Record<string, string> | undefined,
			timeoutMs: a.timeoutMs ? Number(a.timeoutMs) : undefined,
			maxBytes: a.maxBytes ? Number(a.maxBytes) : undefined,
		}),
	dc_web_search: async (a) =>
		Web.webSearch(String(a.query), {
			maxResults: a.maxResults ? Number(a.maxResults) : undefined,
			engine: a.engine ? (a.engine as "duckduckgo") : undefined,
		}),
	dc_open_url: async (a) => {
		const url = validateHttpUrl(String(a.url ?? "").trim());
		await open(url);
		return { opened: true, url };
	},
};
