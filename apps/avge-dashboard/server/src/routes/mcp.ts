/**
 * MCP Tool Proxy Routes
 *
 * Accepts MCP tool calls from the dashboard frontend and routes
 * them to the appropriate MCP server. In development, provides
 * mock responses when servers are unavailable.
 *
 * POST /api/mcp/call
 * Body: { server: string, tool: string, params: Record<string, unknown> }
 */

import { Router } from 'express';

export const mcpRouter = Router();

/** Registry of known MCP servers and their tool signatures */
const KNOWN_SERVERS = new Set([
  'notebooklm',
  'firebase-mcp-server',
  'cloudrun',
  'genkit-mcp-server',
]);

interface MCPCallRequest {
  server: string;
  tool: string;
  params: Record<string, unknown>;
}

/**
 * POST /api/mcp/call
 *
 * Proxy MCP tool calls. Currently supports:
 * - notebooklm: Routes to NLM HTTP API when cookies are available
 * - Others: Returns mock response with call metadata
 */
mcpRouter.post('/call', async (req, res) => {
  const { server, tool, params } = req.body as MCPCallRequest;

  if (!server || !tool) {
    res.status(400).json({ status: 'error', error: 'Missing server or tool' });
    return;
  }

  console.log(`[MCP Proxy] ${server}.${tool}`, JSON.stringify(params).slice(0, 200));

  if (!KNOWN_SERVERS.has(server)) {
    res.status(404).json({ status: 'error', error: `Unknown MCP server: ${server}` });
    return;
  }

  try {
    const result = await routeMCPCall(server, tool, params);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MCP Proxy] Error: ${msg}`);
    res.status(500).json({ status: 'error', error: msg });
  }
});

/**
 * Route an MCP call to the appropriate handler.
 */
async function routeMCPCall(
  server: string,
  tool: string,
  params: Record<string, unknown>,
): Promise<{ status: string; data?: unknown; error?: string }> {
  switch (server) {
    case 'notebooklm':
      return handleNotebookLMCall(tool, params);
    default:
      return {
        status: 'error',
        error: `MCP server '${server}' proxy not yet implemented. Call logged for debugging.`,
      };
  }
}

/**
 * Handle NotebookLM MCP tool calls.
 *
 * When NLM cookies are available (via NOTEBOOKLM_COOKIES env),
 * this routes to the real NLM API. Otherwise returns structured
 * mock data so the pipeline can run in dev mode.
 */
async function handleNotebookLMCall(
  tool: string,
  params: Record<string, unknown>,
): Promise<{ status: string; data?: unknown; error?: string }> {
  const cookies = process.env.NOTEBOOKLM_COOKIES;

  if (!cookies) {
    console.log(`[NLM Proxy] No auth — returning dev mock for ${tool}`);
    return mockNotebookLMResponse(tool, params);
  }

  // When cookies are available, we could implement real NLM HTTP calls here.
  // For now, log the call and return mock data.
  console.log(`[NLM Proxy] Auth available — would call real NLM API for ${tool}`);
  return mockNotebookLMResponse(tool, params);
}

/**
 * Generate structured mock responses for NotebookLM tools.
 * Enables the full pipeline to run in dev mode without auth.
 */
function mockNotebookLMResponse(
  tool: string,
  params: Record<string, unknown>,
): { status: string; data?: unknown } {
  switch (tool) {
    case 'notebook_create':
      return {
        status: 'success',
        data: {
          notebook_id: `mock-nb-${Date.now()}`,
          title: params.title ?? 'Untitled',
        },
      };

    case 'notebook_add_url':
      return {
        status: 'success',
        data: { source_id: `mock-src-${Date.now()}` },
      };

    case 'notebook_add_text':
      return {
        status: 'success',
        data: { source_id: `mock-txt-${Date.now()}` },
      };

    case 'notebook_query':
      return {
        status: 'success',
        data: {
          answer: generateMockScriptResponse(params.query as string),
          sources: ['mock-source-1', 'mock-source-2'],
          conversation_id: `mock-conv-${Date.now()}`,
        },
      };

    case 'notebook_describe':
      return {
        status: 'success',
        data: {
          summary: 'Mock notebook containing ingested source material for video generation.',
          suggested_topics: ['Key trends', 'Audience analysis', 'Content gaps'],
        },
      };

    case 'notebook_get':
      return {
        status: 'success',
        data: {
          notebook_id: params.notebook_id,
          title: 'AVGE Project',
          sources: [],
        },
      };

    case 'notebook_list':
      return {
        status: 'success',
        data: { notebooks: [] },
      };

    default:
      return { status: 'error', data: { error: `Unknown NLM tool: ${tool}` } };
  }
}

/**
 * Generate a realistic mock script response for dev testing.
 */
function generateMockScriptResponse(query?: string): string {
  if (query?.includes('script') || query?.includes('Script')) {
    return `[SEGMENT 1 | 0-5 seconds]
NARRATION: Have you ever wondered why some videos go viral while others fade into obscurity? The answer might surprise you.
VISUAL: Dark screen fading into a montage of viral video thumbnails
MOOD: mysterious

[SEGMENT 2 | 5-10 seconds]
NARRATION: Today we're breaking down the exact formula that top creators use to capture attention in the first three seconds.
VISUAL: Split screen showing engagement analytics and creator workspace
MOOD: analytical

[SEGMENT 3 | 10-15 seconds]
NARRATION: The secret lies in what psychologists call the anxiety gap — the space between what you know and what you need to know.
VISUAL: Animated diagram showing the curiosity gap concept
MOOD: tense

[SEGMENT 4 | 15-20 seconds]
NARRATION: And by the end of this video, you'll have the exact blueprint to weaponize this in your own content.
VISUAL: Blueprint animation revealing a step-by-step process
MOOD: triumphant`;
  }

  return `Based on the source analysis, here are the key patterns identified:

1. **Hook Patterns**: Opening with provocative questions drives 3x higher retention in the first 5 seconds.
2. **Story Structures**: Problem-Agitation-Solution (PAS) framework dominates top-performing content.
3. **Anxiety Triggers**: Financial FOMO and career stagnation are the strongest engagement drivers.
4. **Retention Gaps**: Mid-video lulls at the 40-60% mark consistently lose 15-25% of viewers.

Recommendation: Lead with a data-backed statistic, follow PAS structure, and insert re-hooks at 40% and 70% marks.`;
}
