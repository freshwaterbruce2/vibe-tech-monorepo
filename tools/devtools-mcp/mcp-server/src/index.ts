/**
 * DevTools MCP Server
 *
 * Exposes Chrome DevTools-style capabilities (DOM, console, network, React, JS eval)
 * to any MCP client (Claude, Cursor, etc.) via a browser extension bridge.
 *
 * Transport: stdio (MCP) + WebSocket (extension bridge on port 54321)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ExtensionBridge } from "./bridge.js";

const WS_PORT = Number(process.env.DEVTOOLS_WS_PORT ?? 54321);
const bridge = new ExtensionBridge(WS_PORT);

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  // ── DOM ──────────────────────────────────────────────────────────────────
  {
    name: "dom_query",
    description:
      "Query DOM elements by CSS selector. Returns tag, id, classes, text content, key attributes, and a snippet of outer HTML.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector (e.g. 'h1', '.btn', '#app')" },
        limit: { type: "number", description: "Max elements to return (default 20)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "dom_get_html",
    description: "Get the innerHTML or outerHTML of matched DOM elements.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        type: { type: "string", enum: ["inner", "outer"], description: "Default: inner" },
      },
      required: ["selector"],
    },
  },
  {
    name: "dom_set_html",
    description: "Set innerHTML or outerHTML on the first matched element.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        html: { type: "string", description: "HTML string to set" },
        type: { type: "string", enum: ["inner", "outer"], description: "Default: inner" },
      },
      required: ["selector", "html"],
    },
  },
  {
    name: "dom_set_attribute",
    description: "Set an attribute on matched DOM elements.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        attribute: { type: "string", description: "Attribute name, e.g. 'disabled', 'data-id'" },
        value: { type: "string", description: "Attribute value" },
      },
      required: ["selector", "attribute", "value"],
    },
  },
  {
    name: "dom_set_style",
    description: "Set a CSS inline style property on matched elements.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        property: { type: "string", description: "CSS property in camelCase, e.g. 'backgroundColor'" },
        value: { type: "string", description: "CSS value, e.g. 'red', '16px'" },
      },
      required: ["selector", "property", "value"],
    },
  },

  // ── JavaScript Eval ──────────────────────────────────────────────────────
  {
    name: "js_eval",
    description:
      "Evaluate JavaScript in the page context. Returns the result (JSON-serialized) or the thrown error. Async expressions are supported.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to evaluate" },
      },
      required: ["code"],
    },
  },

  // ── Console ──────────────────────────────────────────────────────────────
  {
    name: "console_get_logs",
    description: "Get captured console output from the page (log, warn, error, info, debug).",
    inputSchema: {
      type: "object",
      properties: {
        level: {
          type: "string",
          enum: ["all", "log", "warn", "error", "info", "debug"],
          description: "Filter by level (default: all)",
        },
        limit: { type: "number", description: "Max entries to return (default 100)" },
      },
    },
  },
  {
    name: "console_clear_logs",
    description: "Clear the captured console log buffer.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── Network ──────────────────────────────────────────────────────────────
  {
    name: "network_get_requests",
    description:
      "Get captured network requests (fetch + XHR). Includes URL, method, status, timing, headers, and body snippet.",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", description: "URL substring filter (optional)" },
        limit: { type: "number", description: "Max requests to return (default 50)" },
      },
    },
  },
  {
    name: "network_clear",
    description: "Clear the captured network request log.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── React ────────────────────────────────────────────────────────────────
  {
    name: "react_get_tree",
    description:
      "Get the React component tree for the page (or subtree starting from a CSS selector). Returns component names, prop summaries, and state summaries.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "Root element CSS selector (default: document root)",
        },
        maxDepth: { type: "number", description: "Max tree depth (default 8)" },
      },
    },
  },
  {
    name: "react_inspect",
    description:
      "Inspect the nearest React component attached to a DOM element — returns full props and state.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
      },
      required: ["selector"],
    },
  },

  // ── Page ─────────────────────────────────────────────────────────────────
  {
    name: "page_info",
    description: "Get current page URL, title, viewport dimensions, and document ready state.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "page_navigate",
    description: "Navigate the active tab to a URL.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to navigate to" },
      },
      required: ["url"],
    },
  },
];

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "devtools-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const result = await bridge.call(name, args as Record<string, unknown>);
    return {
      content: [
        {
          type: "text" as const,
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[devtools-mcp] Server started. Waiting for extension on ws://localhost:" + WS_PORT + "\n");
}

main().catch((err) => {
  process.stderr.write(`[devtools-mcp] Fatal: ${err}\n`);
  process.exit(1);
});
