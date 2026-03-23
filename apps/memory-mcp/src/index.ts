#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  AutoCapture,
  createLlmSummarizerFromEnv,
  CryptoMemory,
  GitMemory,
  HierarchicalSummarizer,
  LearningBridge,
  MarkdownExporter,
  MemoryConsolidator,
  MemoryDecay,
  MemoryManager,
  NovaMemory,
  PatternAnalyzer,
} from '@vibetech/memory';
import * as http from 'http';
import { handleToolCall, type SummarizationDeps } from './handlers.js';
import { tools } from './tools.js';

// Initialize memory manager
const memoryManager = new MemoryManager({
  dbPath: process.env.MEMORY_DB_PATH || 'D:\\databases\\memory.db',
  embeddingModel: process.env.MEMORY_EMBEDDING_MODEL || 'text-embedding-3-small',
  embeddingDimension: parseInt(process.env.MEMORY_EMBEDDING_DIM || '1536', 10),
  embeddingEndpoint: process.env.MEMORY_EMBEDDING_ENDPOINT || 'http://localhost:3001',
  fallbackToTransformers: process.env.MEMORY_FALLBACK_TRANSFORMERS !== 'false',
  logLevel: (process.env.MEMORY_LOG_LEVEL as any) || 'info',
});

// Initialize auto-capture
let autoCapture: AutoCapture | null = null;

// Initialize analyzer, exporter, consolidator, and integrations (created after memory init)
let analyzer: PatternAnalyzer | null = null;
let exporter: MarkdownExporter | null = null;
let consolidator: MemoryConsolidator | null = null;
let cryptoMemory: CryptoMemory | null = null;
let gitMemory: GitMemory | null = null;
let novaMemory: NovaMemory | null = null;
let learningBridge: LearningBridge | null = null;
let summarizationDeps: SummarizationDeps = { summarizer: null, decay: null, llm: null };

// Create MCP server
const server = new Server(
  {
    name: 'memory-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  let result;
  let success = true;

  try {
    result = await handleToolCall(
      request,
      memoryManager,
      analyzer,
      exporter,
      consolidator,
      cryptoMemory,
      gitMemory,
      novaMemory,
      learningBridge,
      summarizationDeps,
    );
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    // Track tool usage if auto-capture is enabled
    if (autoCapture && process.env.MEMORY_AUTO_CAPTURE !== 'false') {
      try {
        await autoCapture.captureToolUse(
          request.params.name,
          request.params.arguments || {},
          success ? 'success' : 'failure',
          {
            duration: Date.now() - startTime,
            resultSize: result ? JSON.stringify(result).length : 0,
          },
        );
      } catch (captureError) {
        // Don't fail the tool call if capture fails
        console.error('[memory-mcp] Auto-capture failed:', captureError);
      }
    }
  }
});

// Start server
async function main() {
  try {
    console.error('[memory-mcp] Initializing memory system...');
    await memoryManager.init();

    // Initialize analyzer, exporter, consolidator, and integrations
    analyzer = new PatternAnalyzer(memoryManager);
    exporter = new MarkdownExporter(memoryManager, analyzer);
    consolidator = new MemoryConsolidator(memoryManager);
    cryptoMemory = new CryptoMemory(memoryManager);
    gitMemory = new GitMemory(memoryManager);
    novaMemory = new NovaMemory(memoryManager);

    // Initialize learning bridge (L4: uses env var for DB path)
    try {
      const learningDbPath = process.env.LEARNING_DB_PATH ?? 'D:\\databases\\nova_shared.db';
      learningBridge = new LearningBridge(memoryManager, learningDbPath);
      console.error(`[memory-mcp] Learning bridge connected: ${learningDbPath}`);
    } catch (err) {
      console.error('[memory-mcp] Learning bridge init failed (non-fatal):', err);
    }

    // Initialize hierarchical summarizer & memory decay
    try {
      const llm = createLlmSummarizerFromEnv();
      const summarizer = new HierarchicalSummarizer(
        llm ? { summarizeFn: llm.createSyncFallback() } : {},
      );
      const decay = new MemoryDecay();
      summarizationDeps = { summarizer, decay, llm };
      console.error(`[memory-mcp] Summarizer + decay ready (LLM: ${llm ? 'yes' : 'extractive'})`);

      // Phase 5: Auto-consolidation piggybacked on decay timer
      if (decay && summarizer) {
        const EPISODIC_THRESHOLD = 500;

        decay.startScheduled(memoryManager.getDb(), (result: { archived: number; remaining: number }) => {
          console.error(
            `[memory-mcp] Decay run: archived ${result.archived}, remaining ${result.remaining}`,
          );

          // Auto-consolidate when episodic count exceeds threshold
          try {
            const currentStats = memoryManager.getStats();
            if (currentStats.database.episodicCount > EPISODIC_THRESHOLD) {
              summarizer.run(memoryManager.getDb()).then((consResult) => {
                console.error(
                  `[memory-mcp] Auto-consolidation: ${consResult.sessionsCreated} sessions, ${consResult.topicsCreated} topics`,
                );
              }).catch((consErr: unknown) => {
                console.error('[memory-mcp] Auto-consolidation failed:', consErr);
              });
            }
          } catch (consErr) {
            console.error('[memory-mcp] Auto-consolidation failed:', consErr);
          }
        });

        console.error(`[memory-mcp] Auto-consolidation enabled (threshold: ${EPISODIC_THRESHOLD} episodic)`);
      }
    } catch (err) {
      console.error('[memory-mcp] Summarizer/decay init failed (non-fatal):', err);
    }

    const stats = memoryManager.getStats();
    console.error(`[memory-mcp] Memory system ready:`);
    console.error(
      `  - Database: ${stats.database.episodicCount} episodic, ${stats.database.semanticCount} semantic, ${stats.database.proceduralCount} procedural`,
    );
    console.error(`  - Embedding: ${stats.embedding.provider} (${stats.embedding.dimension}d)`);

    // Initialize auto-capture if enabled
    if (process.env.MEMORY_AUTO_CAPTURE !== 'false') {
      autoCapture = new AutoCapture(memoryManager, {
        sourceId: 'claude-code-mcp',
        captureSessionEvents: true,
        captureFileEdits: false, // File edits tracked separately
        captureGitCommits: false, // Git commits tracked separately
        minImportance: 5,
      });

      await autoCapture.captureSessionStart({
        mcp_version: '1.0.0',
        node_version: process.version,
        platform: process.platform,
      });

      console.error(`[memory-mcp] Auto-capture enabled (session: ${autoCapture.getSessionId()})`);
    }

    // Start HTTP Bridge to support VTDE and other HTTP clients
    const HTTP_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3200;
    const httpServer = http.createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          if (payload.method === 'tools/call') {
            const requestObj = {
              params: payload.params,
            } as any;

            const result = await handleToolCall(
              requestObj,
              memoryManager,
              analyzer,
              exporter,
              consolidator,
              cryptoMemory,
              gitMemory,
              novaMemory,
              learningBridge,
              summarizationDeps,
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                jsonrpc: '2.0',
                id: payload.id,
                result,
              }),
            );
          } else {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Unsupported method' }));
          }
        } catch (err: any) {
          console.error('[memory-mcp] HTTP Error:', err);
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    });

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[memory-mcp] Port ${HTTP_PORT} already in use — HTTP Bridge disabled, stdio still active`);
      } else {
        throw err;
      }
    });
    httpServer.listen(HTTP_PORT, () => {
      console.error(`[memory-mcp] HTTP Bridge listening on port ${HTTP_PORT}`);
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[memory-mcp] Server running on stdio');

    // Capture session end on process exit
    const cleanup = async () => {
      if (autoCapture) {
        const duration = autoCapture.getSessionDuration();
        const durationMin = Math.round(duration / 60000);
        await autoCapture.captureSessionEnd(`MCP session ended after ${durationMin} minutes`);
        console.error('[memory-mcp] Session captured');
      }
      memoryManager.close();
    };

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('[memory-mcp] Initialization failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[memory-mcp] Fatal error:', error);
  process.exit(1);
});
