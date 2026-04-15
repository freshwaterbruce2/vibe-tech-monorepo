/**
 * Bridge: WebSocket server that browser extension connects to.
 * Routes MCP tool calls → extension → page → back.
 */

import { WebSocketServer, WebSocket } from "ws";

export type ToolRequest = {
  id: string;
  tool: string;
  params: Record<string, unknown>;
};

export type ToolResponse = {
  id: string;
  result?: unknown;
  error?: string;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const TIMEOUT_MS = 15_000;

export class ExtensionBridge {
  private wss: WebSocketServer;
  private client: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private _port: number;

  constructor(port = 54321) {
    this._port = port;
    this.wss = new WebSocketServer({ port });
    this.wss.on("connection", (ws) => this.handleConnection(ws));
    process.stderr.write(`[bridge] WebSocket server listening on ws://localhost:${port}\n`);
  }

  get port(): number {
    return this._port;
  }

  get isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  private handleConnection(ws: WebSocket) {
    // New extension connection — latest wins
    if (this.client) {
      process.stderr.write("[bridge] New extension connected, replacing previous\n");
      this.client.terminate();
    }
    this.client = ws;
    process.stderr.write("[bridge] Browser extension connected\n");

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ToolResponse;
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      } catch (err) {
        process.stderr.write(`[bridge] Failed to parse message: ${err}\n`);
      }
    });

    ws.on("close", () => {
      process.stderr.write("[bridge] Browser extension disconnected\n");
      if (this.client === ws) this.client = null;
      // Reject all pending requests
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Extension disconnected"));
        this.pending.delete(id);
      }
    });

    ws.on("error", (err) => {
      process.stderr.write(`[bridge] WebSocket error: ${err.message}\n`);
    });
  }

  async call(tool: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error(
        "No browser extension connected. Make sure the DevTools MCP extension is installed and the page is open."
      );
    }

    const id = crypto.randomUUID();
    const request: ToolRequest = { id, tool, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Tool '${tool}' timed out after ${TIMEOUT_MS / 1000}s`));
      }, TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });

      try {
        this.client!.send(JSON.stringify(request));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error(`Failed to send to extension: ${err}`));
      }
    });
  }
}
