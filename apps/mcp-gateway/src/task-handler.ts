import type {
    AgentStepResult,
    AgentTaskDispatchPayload,
    McpToolCallPayload,
} from '@vibetech/shared-ipc';
import type { McpClientManager } from './mcp-client.js';

/**
 * Processes incoming agent tasks by executing MCP tool calls
 * and collecting results.
 */
export class TaskHandler {
    private mcpClient: McpClientManager;

    constructor(mcpClient: McpClientManager) {
        this.mcpClient = mcpClient;
    }

    /**
     * Execute a multi-step agent task dispatch.
     * Runs steps sequentially, collecting results for each.
     */
    async handleTaskDispatch(payload: AgentTaskDispatchPayload): Promise<{
        status: 'success' | 'partial' | 'failed' | 'timeout';
        results: AgentStepResult[];
        durationMs: number;
    }> {
        const startMs = performance.now();
        const results: AgentStepResult[] = [];
        let hasFailures = false;

        console.log(
            `[task-handler] Dispatching task ${payload.taskId}: "${payload.description}" (${payload.steps.length} steps)`
        );

        for (let i = 0; i < payload.steps.length; i++) {
            const step = payload.steps[i];
            const stepStart = performance.now();

            try {
                const result = await this.mcpClient.callTool(
                    step.server,
                    step.tool,
                    step.args
                );

                results.push({
                    stepIndex: i,
                    success: result.success,
                    data: result.data,
                    error: result.error,
                    durationMs: Math.round(performance.now() - stepStart),
                });

                if (!result.success) {
                    hasFailures = true;
                    // Continue executing remaining steps (partial results)
                }
            } catch (err) {
                hasFailures = true;
                results.push({
                    stepIndex: i,
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                    durationMs: Math.round(performance.now() - stepStart),
                });
            }
        }

        const durationMs = Math.round(performance.now() - startMs);
        const allFailed = results.every((r) => !r.success);
        const status = allFailed ? 'failed' : hasFailures ? 'partial' : 'success';

        console.log(
            `[task-handler] Task ${payload.taskId} ${status} in ${durationMs}ms (${results.filter((r) => r.success).length}/${results.length} steps ok)`
        );

        return { status, results, durationMs };
    }

    /**
     * Execute a single MCP tool call (simpler than full task dispatch).
     */
    async handleToolCall(payload: McpToolCallPayload): Promise<{
        success: boolean;
        data?: unknown;
        error?: string;
        durationMs: number;
    }> {
        const startMs = performance.now();

        console.log(
            `[task-handler] Tool call ${payload.callId}: ${payload.server}.${payload.tool}`
        );

        const result = await this.mcpClient.callTool(
            payload.server,
            payload.tool,
            payload.args
        );

        return {
            ...result,
            durationMs: Math.round(performance.now() - startMs),
        };
    }
}
