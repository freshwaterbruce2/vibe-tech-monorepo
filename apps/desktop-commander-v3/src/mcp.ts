import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./Logger.js";
import { systemTools, systemHandlers } from "./tools/system.js";
import { filesystemTools, filesystemHandlers } from "./tools/filesystem.js";
import { filesystemMutateTools, filesystemMutateHandlers } from "./tools/filesystem-mutate.js";
import { uiTools, uiHandlers } from "./tools/ui.js";
import { mediaWebTools, mediaWebHandlers } from "./tools/media-web.js";

const tools = [...systemTools, ...filesystemTools, ...filesystemMutateTools, ...uiTools, ...mediaWebTools];
const handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
	...systemHandlers,
	...filesystemHandlers,
	...filesystemMutateHandlers,
	...uiHandlers,
	...mediaWebHandlers,
};

function asTextContent(value: unknown): { content: Array<{ type: "text"; text: string }> } {
	return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

const server = new Server(
	{ name: "desktop-commander-v3", version: "2.0.0" },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	const a = (args ?? {}) as Record<string, unknown>;
	try {
		const handler = handlers[name];
		if (!handler) throw new Error(`Unknown tool: ${name}`);
		return asTextContent(await handler(a));
	} catch (error) {
		const baseMessage = error instanceof Error ? error.message : "Unknown error";
		let guidance = "";
		if (baseMessage.includes("ENOENT")) guidance = " File not found. Use 'dc_list_directory' to browse available files.";
		else if (baseMessage.includes("EACCES") || baseMessage.includes("Permission denied")) guidance = " Permission denied. Use 'dc_get_allowed_paths' to see allowed directories.";
		else if (baseMessage.includes("ETIMEDOUT") || baseMessage.includes("timeout")) guidance = " Operation timed out. Try with a longer timeout parameter.";
		else if (baseMessage.includes("EPERM")) guidance = " Operation not permitted. May require administrator privileges.";
		return { content: [{ type: "text", text: baseMessage + guidance }], isError: true };
	}
});

process.on("unhandledRejection", (reason) => {
	logger.error("Unhandled rejection in desktop-commander-v3 MCP server:", reason);
});

await server.connect(new StdioServerTransport());
