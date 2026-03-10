/**
 * MCP Service Bridge
 *
 * Provides a unified interface for calling MCP tools from the dashboard.
 * In development, this calls MCP tools directly via the MCP protocol.
 * In production, this routes through a backend API.
 *
 * All NotebookLM operations flow through this bridge.
 */

export interface MCPCallResult<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

/**
 * Generic MCP tool caller.
 * This is the single point of integration with the MCP runtime.
 *
 * In the Antigravity IDE context, MCP tools are available natively.
 * For standalone use, this would route to a backend proxy.
 */
export async function callMCPTool<T = unknown>(
  serverName: string,
  toolName: string,
  params: Record<string, unknown>,
): Promise<MCPCallResult<T>> {
  console.log(`[MCP] Calling ${serverName}.${toolName}`, params);

  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: serverName, tool: toolName, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { status: 'error', error: `MCP call failed: ${errorText}` };
    }

    // Backend proxy already returns { status, data, error? } — pass through directly
    const result = (await response.json()) as MCPCallResult<T>;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[MCP] Tool call failed: ${message}`);
    return { status: 'error', error: message };
  }
}

// ─── NotebookLM-specific MCP helpers ───

export async function nlmCreateNotebook(title: string) {
  return callMCPTool<{ notebook_id: string }>('notebooklm', 'notebook_create', { title });
}

export async function nlmAddUrl(notebookId: string, url: string) {
  return callMCPTool('notebooklm', 'notebook_add_url', { notebook_id: notebookId, url });
}

export async function nlmAddText(notebookId: string, text: string, title: string) {
  return callMCPTool('notebooklm', 'notebook_add_text', {
    notebook_id: notebookId,
    text,
    title,
  });
}

export async function nlmQuery(
  notebookId: string,
  query: string,
  sourceIds?: string[],
  conversationId?: string,
) {
  return callMCPTool<{ answer: string; sources: string[]; conversation_id?: string }>(
    'notebooklm',
    'notebook_query',
    {
      notebook_id: notebookId,
      query,
      ...(sourceIds ? { source_ids: sourceIds } : {}),
      ...(conversationId ? { conversation_id: conversationId } : {}),
    },
  );
}

export async function nlmDescribe(notebookId: string) {
  return callMCPTool<{ summary: string; suggested_topics: string[] }>(
    'notebooklm',
    'notebook_describe',
    { notebook_id: notebookId },
  );
}

export async function nlmGetNotebook(notebookId: string) {
  return callMCPTool('notebooklm', 'notebook_get', { notebook_id: notebookId });
}

export async function nlmListNotebooks(maxResults = 20) {
  return callMCPTool('notebooklm', 'notebook_list', { max_results: maxResults });
}
