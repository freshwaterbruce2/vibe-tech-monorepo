import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { KimiClient } from './kimi-client.js';
import { Semaphore } from './rate-limit.js';
import { deduplicateToolSchemas } from './schema-dedup.js';

const DEFAULT_PORT = 8787;
const MAX_CONCURRENCY = 30;

interface OpenAICompletionRequest {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: Array<{ type: string; function: unknown }>;
  tool_choice?: unknown;
  temperature?: number;
  max_tokens?: number;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function parseOpenAIRequest(body: string): OpenAICompletionRequest {
  return JSON.parse(body) as OpenAICompletionRequest;
}

function extractTools(request: OpenAICompletionRequest) {
  return (
    request.tools
      ?.filter((t) => t.type === 'function')
      .map(
        (t) =>
          t.function as {
            name: string;
            description?: string;
            parameters: Record<string, unknown>;
          },
      ) ?? []
  );
}

async function handleCompletion(
  client: KimiClient,
  request: OpenAICompletionRequest,
): Promise<{
  body: string;
  headers: Record<string, string>;
}> {
  const tools = extractTools(request);
  const dedupedTools = deduplicateToolSchemas(
    tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  );

  const response = await client.complete({
    messages: request.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant' | 'tool',
      content: m.content,
    })),
    tools: dedupedTools,
    tool_choice: request.tool_choice as
      | 'auto'
      | 'none'
      | { type: 'function'; function: { name: string } }
      | undefined,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
  });

  const cacheHit = response.usage?.prompt_cache_hit_tokens ?? 0;
  const cacheMiss = response.usage?.prompt_cache_miss_tokens ?? 0;
  const cacheRatio = cacheHit + cacheMiss > 0 ? cacheHit / (cacheHit + cacheMiss) : 0;

  return {
    body: JSON.stringify(response),
    headers: {
      'Content-Type': 'application/json',
      'X-Kimi-Cache-Hit-Tokens': String(cacheHit),
      'X-Kimi-Cache-Miss-Tokens': String(cacheMiss),
      'X-Kimi-Cache-Ratio': cacheRatio.toFixed(4),
    },
  };
}

async function handleRequest(
  client: KimiClient,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await readBody(req);
    const openAiRequest = parseOpenAIRequest(body);
    const { body: responseBody, headers } = await handleCompletion(client, openAiRequest);
    res.writeHead(200, headers);
    res.end(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }
}

function createKimiProviderServer(): {
  server: ReturnType<typeof createServer>;
  semaphore: Semaphore;
} {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error('KIMI_API_KEY environment variable is required');
  }

  const client = new KimiClient({ apiKey });
  const semaphore = new Semaphore(MAX_CONCURRENCY);

  const server = createServer((req, res) => {
    semaphore
      .acquire()
      .then(async (release) => {
        try {
          await handleRequest(client, req, res);
        } finally {
          release();
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      });
  });

  return { server, semaphore };
}

export function startServer(port = DEFAULT_PORT): ReturnType<typeof createServer> {
  const { server } = createKimiProviderServer();
  server.listen(port, () => {
    console.log(`Kimi Code provider listening on http://localhost:${port}`);
  });
  return server;
}

export { DEFAULT_PORT, MAX_CONCURRENCY };

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer(Number(process.env.KIMI_PROVIDER_PORT ?? DEFAULT_PORT));
}
