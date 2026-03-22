/**
 * Typed event map for all Inngest events in the VibeTech monorepo.
 *
 * Each key is a dot-separated event name, and the value is the payload shape.
 * Inngest uses this to provide type-safe event sending and function triggers.
 */

/** Result summary returned after a RAG index run completes */
export interface RAGIndexSummary {
  filesProcessed: number;
  chunksCreated: number;
  chunksRemoved: number;
  errors: Array<{ filePath: string; error: string }>;
  durationMs: number;
}

export type Events = {
  /**
   * Request a full or incremental RAG index run.
   * Triggers the multi-step RAG indexing pipeline.
   */
  'rag/index.requested': {
    data: {
      full: boolean;
      workspaceRoot: string;
      /** Optional: limit indexing to specific paths (relative to workspace) */
      paths?: string[];
    };
  };

  /**
   * Internal: batch of files to chunk. Sent by the discover step.
   */
  'rag/files.discovered': {
    data: {
      runId: string;
      filePaths: string[];
      workspaceRoot: string;
    };
  };

  /**
   * Internal: batch of chunks ready for embedding.
   */
  'rag/chunks.ready': {
    data: {
      runId: string;
      batchIndex: number;
      totalBatches: number;
      /** Serialised Chunk[] — kept as JSON string to stay under event size limits */
      chunksJson: string;
    };
  };

  /**
   * Emitted when a RAG index run completes (success or partial failure).
   */
  'rag/index.completed': {
    data: {
      runId: string;
      summary: RAGIndexSummary;
    };
  };

  /**
   * Emitted when a RAG index run fails entirely.
   */
  'rag/index.failed': {
    data: {
      runId: string;
      error: string;
    };
  };

  // ─── Gravity-Claw Events ────────────────────────────────────────────────────

  /**
   * Daily heartbeat cron — sends a Telegram morning greeting.
   * Triggered on schedule, no user-sent data needed.
   */
  'gclaw/heartbeat': {
    data: Record<string, never>;
  };

  /**
   * Request to refresh MCP tools from the gateway.
   */
  'gclaw/tools.refresh': {
    data: Record<string, never>;
  };

  /**
   * Emitted after heartbeat delivery succeeds or fails.
   */
  'gclaw/heartbeat.completed': {
    data: {
      success: boolean;
      error?: string;
      chatId?: string;
    };
  };
};
