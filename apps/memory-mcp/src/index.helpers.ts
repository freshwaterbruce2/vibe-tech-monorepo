import type {
  AutoCapture,
  HierarchicalSummarizer,
  LearningBridge,
  MemoryDecay,
  MemoryManager,
} from '@vibetech/memory';
import * as http from 'http';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall, type SummarizationDeps } from './handlers.js';
import type { CoreDeps, IntegrationDeps, LearningDeps } from './handler-types.js';

export interface IntegrationState extends CoreDeps, IntegrationDeps, Omit<LearningDeps, 'memoryManager'> {}

export function initializeCoreDeps(
  memoryManager: MemoryManager,
  PatternAnalyzerClass: typeof import('@vibetech/memory').PatternAnalyzer,
  MarkdownExporterClass: typeof import('@vibetech/memory').MarkdownExporter,
  MemoryConsolidatorClass: typeof import('@vibetech/memory').MemoryConsolidator,
): CoreDeps {
  const analyzer = new PatternAnalyzerClass(memoryManager);
  return {
    memoryManager,
    analyzer,
    exporter: new MarkdownExporterClass(memoryManager, analyzer),
    consolidator: new MemoryConsolidatorClass(memoryManager),
  };
}

export function initializeIntegrationDeps(
  memoryManager: MemoryManager,
  CryptoMemoryClass: typeof import('@vibetech/memory').CryptoMemory,
  GitMemoryClass: typeof import('@vibetech/memory').GitMemory,
  NovaMemoryClass: typeof import('@vibetech/memory').NovaMemory,
): IntegrationDeps {
  return {
    cryptoMemory: new CryptoMemoryClass(memoryManager),
    gitMemory: new GitMemoryClass(memoryManager),
    novaMemory: new NovaMemoryClass(memoryManager),
  };
}

export function initializeLearningBridge(
  LearningBridgeClass: typeof import('@vibetech/memory').LearningBridge,
  memoryManager: MemoryManager,
): LearningBridge | null {
  try {
    const learningDbPath = process.env.LEARNING_DB_PATH ?? 'D:\\databases\\agent_learning.db';
    const bridge = new LearningBridgeClass(memoryManager, learningDbPath);
    console.error(`[memory-mcp] Learning bridge connected: ${learningDbPath}`);
    return bridge;
  } catch (err) {
    console.error('[memory-mcp] Learning bridge init failed (non-fatal):', err);
    return null;
  }
}

export function createSummarizationDeps(
  HierarchicalSummarizerClass: typeof HierarchicalSummarizer,
  MemoryDecayClass: typeof MemoryDecay,
  createLlmSummarizerFromEnv: () => import('@vibetech/memory').LlmSummarizer | null,
): SummarizationDeps {
  const llm = createLlmSummarizerFromEnv();
  const summarizer = new HierarchicalSummarizerClass(
    llm ? { summarizeFn: llm.createSyncFallback() } : {},
  );
  const decay = new MemoryDecayClass();
  return { summarizer, decay, llm };
}

export function tryInitializeSummarization(
  HierarchicalSummarizerClass: typeof HierarchicalSummarizer,
  MemoryDecayClass: typeof MemoryDecay,
  createLlmSummarizerFromEnv: () => import('@vibetech/memory').LlmSummarizer | null,
  memoryManager: MemoryManager,
  learningBridge: LearningBridge | null,
): SummarizationDeps {
  try {
    const deps = createSummarizationDeps(
      HierarchicalSummarizerClass,
      MemoryDecayClass,
      createLlmSummarizerFromEnv,
    );
    console.error(
      `[memory-mcp] Summarizer + decay ready (LLM: ${deps.llm ? 'yes' : 'extractive'})`,
    );
    if (deps.decay && deps.summarizer) {
      startDecayScheduler(memoryManager, deps.summarizer, deps.decay, learningBridge);
      console.error('[memory-mcp] Auto-consolidation enabled');
      if (learningBridge) {
        console.error('[memory-mcp] Periodic learning sync enabled (runs on decay timer)');
      }
    }
    return deps;
  } catch (err) {
    console.error('[memory-mcp] Summarizer/decay init failed (non-fatal):', err);
    return { summarizer: null, decay: null, llm: null };
  }
}

function logDecayResult(result: { archived: number; remaining: number }): void {
  console.error(
    `[memory-mcp] Decay run: archived ${result.archived}, remaining ${result.remaining}`,
  );
}

async function maybeAutoConsolidate(
  memoryManager: MemoryManager,
  summarizer: HierarchicalSummarizer,
): Promise<void> {
  const EPISODIC_THRESHOLD = 500;
  try {
    const currentStats = memoryManager.getStats();
    if (currentStats.database.episodicCount > EPISODIC_THRESHOLD) {
      const consResult = await summarizer.run(memoryManager.getDb());
      console.error(
        `[memory-mcp] Auto-consolidation: ${consResult.sessionsCreated} sessions, ${consResult.topicsCreated} topics`,
      );
    }
  } catch (consErr) {
    console.error('[memory-mcp] Auto-consolidation failed:', consErr);
  }
}

async function maybeLearningSync(
  learningBridge: LearningBridge | null,
  lastLearningSync: string | undefined,
): Promise<string | undefined> {
  if (!learningBridge) return lastLearningSync;
  const sincePrev = lastLearningSync;
  const cycleStart = new Date().toISOString();
  try {
    const syncResult = await learningBridge.syncFromLearningSystem(sincePrev);
    const total = syncResult.executionsIngested +
      syncResult.patternsIngested +
      syncResult.mistakesIngested;
    if (total > 0) {
      console.error(
        `[memory-mcp] Learning sync (since ${sincePrev ?? 'beginning'}): ` +
        `${syncResult.executionsIngested} executions, ${syncResult.patternsIngested} patterns, ${syncResult.mistakesIngested} mistakes`,
      );
    }
    return cycleStart;
  } catch (syncErr) {
    console.error('[memory-mcp] Learning sync failed:', syncErr);
    return lastLearningSync;
  }
}

export function startDecayScheduler(
  memoryManager: MemoryManager,
  summarizer: HierarchicalSummarizer,
  decay: MemoryDecay,
  learningBridge: LearningBridge | null,
): void {
  let lastLearningSync: string | undefined;
  decay.startScheduled(memoryManager.getDb(), (result: { archived: number; remaining: number }) => {
    logDecayResult(result);
    void maybeAutoConsolidate(memoryManager, summarizer);
    void maybeLearningSync(learningBridge, lastLearningSync).then((updated) => {
      lastLearningSync = updated;
    });
  });
}

export async function tryInitializeAutoCapture(
  AutoCaptureClass: typeof AutoCapture,
  memoryManager: MemoryManager,
): Promise<AutoCapture | null> {
  if (process.env.MEMORY_AUTO_CAPTURE === 'false') return null;
  const capture = initializeAutoCapture(AutoCaptureClass, memoryManager);
  await capture.captureSessionStart({
    mcp_version: '1.0.0',
    node_version: process.version,
    platform: process.platform,
  });
  console.error(`[memory-mcp] Auto-capture enabled (session: ${capture.getSessionId()})`);
  return capture;
}

export function initializeAutoCapture(
  AutoCaptureClass: typeof AutoCapture,
  memoryManager: MemoryManager,
): AutoCapture {
  return new AutoCaptureClass(memoryManager, {
    sourceId: 'claude-code-mcp',
    captureSessionEvents: true,
    captureFileEdits: false, // File edits tracked separately
    captureGitCommits: false, // Git commits tracked separately
    minImportance: 5,
  });
}

interface HttpBridgeRequest {
  method: string;
  params: { name: string; arguments?: Record<string, unknown> };
  id?: string | number;
}

function createToolRequest(payload: HttpBridgeRequest): CallToolRequest {
  return {
    method: 'tools/call',
    params: payload.params,
  } as CallToolRequest;
}

async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  await new Promise<void>((resolve) => {
    req.on('end', () => {
      resolve();
    });
  });
  return body;
}

async function handleHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  state: IntegrationState,
): Promise<void> {
  const body = await readRequestBody(req);
  try {
    const payload = JSON.parse(body) as HttpBridgeRequest;
    if (payload.method !== 'tools/call') {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Unsupported method' }));
      return;
    }
    const result = await handleToolCall(
      createToolRequest(payload),
      state.memoryManager,
      state.analyzer,
      state.exporter,
      state.consolidator,
      state.cryptoMemory,
      state.gitMemory,
      state.novaMemory,
      state.learningBridge,
      state.summarizationDeps,
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }));
  } catch (err) {
    console.error('[memory-mcp] HTTP Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }
}

export function startHttpBridge(
  port: number,
  state: IntegrationState,
): http.Server {
  const server = http.createServer((req, res) => {
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
    void handleHttpRequest(req, res, state);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[memory-mcp] Port ${port} already in use — HTTP Bridge disabled, stdio still active`,
      );
    } else {
      throw err;
    }
  });
  server.listen(port, () => {
    console.error(`[memory-mcp] HTTP Bridge listening on port ${port}`);
  });
  return server;
}

export function logMemoryStats(memoryManager: MemoryManager): void {
  const stats = memoryManager.getStats();
  console.error('[memory-mcp] Memory system ready:');
  console.error(
    `  - Database: ${stats.database.episodicCount} episodic, ` +
    `${stats.database.semanticCount} semantic, ${stats.database.proceduralCount} procedural`,
  );
  console.error(`  - Embedding: ${stats.embedding.provider} (${stats.embedding.dimension}d)`);
}

export async function cleanupAutoCapture(autoCapture: AutoCapture | null): Promise<void> {
  if (!autoCapture) return;
  const duration = autoCapture.getSessionDuration();
  const durationMin = Math.round(duration / 60000);
  await autoCapture.captureSessionEnd(`MCP session ended after ${durationMin} minutes`);
  console.error('[memory-mcp] Session captured');
}

export function setupExitHandlers(cleanup: () => Promise<void>): void {
  process.on('SIGINT', () => {
    void cleanup().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void cleanup().then(() => process.exit(0));
  });
}
