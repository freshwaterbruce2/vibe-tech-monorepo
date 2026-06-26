#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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
import { handleToolCall } from './handlers.js';
import { tools } from './tools.js';
import {
  cleanupAutoCapture,
  initializeCoreDeps,
  initializeIntegrationDeps,
  initializeLearningBridge,
  logMemoryStats,
  setupExitHandlers,
  startHttpBridge,
  tryInitializeAutoCapture,
  tryInitializeSummarization,
  type IntegrationState,
} from './index.helpers.js';

type EmbeddingProvider = 'openrouter' | 'ollama' | 'transformers';

function parseEmbeddingProvider(value: string | undefined): EmbeddingProvider | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  if (value === 'openrouter' || value === 'ollama' || value === 'transformers') {
    return value;
  }
  throw new Error(
    `Invalid MEMORY_EMBEDDING_PROVIDER '${value}'. Expected openrouter, ollama, or transformers.`,
  );
}

const embeddingProvider = parseEmbeddingProvider(process.env.MEMORY_EMBEDDING_PROVIDER);
const memoryManager = new MemoryManager({
  dbPath: process.env.MEMORY_DB_PATH ?? 'D:\\databases\\memory.db',
  embeddingProvider,
  embeddingModel: process.env.MEMORY_EMBEDDING_MODEL,
  embeddingDimension: process.env.MEMORY_EMBEDDING_DIM
    ? parseInt(process.env.MEMORY_EMBEDDING_DIM, 10)
    : undefined,
  embeddingEndpoint: process.env.MEMORY_EMBEDDING_ENDPOINT,
  fallbackToTransformers: process.env.MEMORY_FALLBACK_TRANSFORMERS !== 'false',
  logLevel: (process.env.MEMORY_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') ?? 'info',
});

let autoCapture: AutoCapture | null = null;
let integrationState: IntegrationState = {
  memoryManager,
  analyzer: null,
  exporter: null,
  consolidator: null,
  cryptoMemory: null,
  gitMemory: null,
  novaMemory: null,
  learningBridge: null,
  summarizationDeps: { summarizer: null, decay: null, llm: null },
};

const server = new Server(
  { name: 'memory-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  let result: CallToolResult | undefined;
  let success = true;
  try {
    result = await handleToolCall(
      request,
      integrationState.memoryManager,
      integrationState.analyzer,
      integrationState.exporter,
      integrationState.consolidator,
      integrationState.cryptoMemory,
      integrationState.gitMemory,
      integrationState.novaMemory,
      integrationState.learningBridge,
      integrationState.summarizationDeps,
    );
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    if (autoCapture && process.env.MEMORY_AUTO_CAPTURE !== 'false') {
      try {
        await autoCapture.captureToolUse(
          request.params.name,
          request.params.arguments ?? {},
          success ? 'success' : 'failure',
          {
            duration: Date.now() - startTime,
            resultSize: result ? JSON.stringify(result).length : 0,
          },
        );
      } catch (captureError) {
        console.error('[memory-mcp] Auto-capture failed:', captureError);
      }
    }
  }
});

function resolveHttpPort(): number {
  const bridgePortRaw = process.env.MEMORY_MCP_PORT ?? process.env.MEMORY_BRIDGE_PORT;
  const parsedBridgePort = bridgePortRaw ? Number.parseInt(bridgePortRaw, 10) : Number.NaN;
  return Number.isFinite(parsedBridgePort) ? parsedBridgePort : 3200;
}

async function initializeSubsystems(): Promise<void> {
  console.error('[memory-mcp] Initializing memory system...');
  await memoryManager.init();

  const coreDeps = initializeCoreDeps(
    memoryManager,
    PatternAnalyzer,
    MarkdownExporter,
    MemoryConsolidator,
  );
  const integrationDeps = initializeIntegrationDeps(
    memoryManager,
    CryptoMemory,
    GitMemory,
    NovaMemory,
  );
  const learningBridge = initializeLearningBridge(LearningBridge, memoryManager);
  const summarizationDeps = tryInitializeSummarization(
    HierarchicalSummarizer,
    MemoryDecay,
    createLlmSummarizerFromEnv,
    memoryManager,
    learningBridge,
  );

  integrationState = { ...coreDeps, ...integrationDeps, learningBridge, summarizationDeps };

  logMemoryStats(memoryManager);
  autoCapture = await tryInitializeAutoCapture(AutoCapture, memoryManager);
}

async function cleanup(): Promise<void> {
  await cleanupAutoCapture(autoCapture);
  memoryManager.close();
}

async function main() {
  try {
    await initializeSubsystems();
    startHttpBridge(resolveHttpPort(), integrationState);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[memory-mcp] Server running on stdio');
    setupExitHandlers(cleanup);
  } catch (error) {
    console.error('[memory-mcp] Initialization failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[memory-mcp] Fatal error:', error);
  process.exit(1);
});
