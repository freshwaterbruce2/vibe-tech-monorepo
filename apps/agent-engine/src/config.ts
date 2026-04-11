import { resolve } from 'path';
import { z } from 'zod';

const configSchema = z.object({
  AGENT_ENGINE_MODEL: z.string().default('kimi-k2.5'),
  KIMI_API_KEY: z.string().optional(),
  AGENT_ENGINE_BEHAVIORAL_PROVIDER: z.enum(['auto', 'moonshot', 'scripted']).default('auto'),
  WORKSPACE_ROOT: z.string().default('C:\\dev'),
  AGENT_ENGINE_OUTPUT_ROOT: z.string().default('D:\\learning-system\\agent-engine'),
  MEMORY_MCP_HTTP_URL: z.string().default('http://127.0.0.1:3200'),
  MEMORY_MCP_LOCAL_PATH: z.string().default(''),
  NX_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
  GIT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  AGENT_ENGINE_EXTERNAL_BENCHMARK_CMD: z.string().default(''),
});

export const CONFIG = configSchema.parse(process.env);

export const PATHS = {
  workspaceRoot: CONFIG.WORKSPACE_ROOT,
  outputRoot: CONFIG.AGENT_ENGINE_OUTPUT_ROOT,
  tracesDir: resolve(CONFIG.AGENT_ENGINE_OUTPUT_ROOT, 'traces'),
  candidatesDir: resolve(CONFIG.AGENT_ENGINE_OUTPUT_ROOT, 'candidates'),
  policiesDir: resolve(CONFIG.AGENT_ENGINE_OUTPUT_ROOT, 'policies'),
  worktreesDir: resolve(CONFIG.AGENT_ENGINE_OUTPUT_ROOT, 'worktrees'),
  memoryDir: resolve(CONFIG.MEMORY_MCP_LOCAL_PATH || CONFIG.AGENT_ENGINE_OUTPUT_ROOT, 'memory'),
  rollbackDir: resolve(CONFIG.AGENT_ENGINE_OUTPUT_ROOT, 'rollbacks'),
};

export function assertKimiConfigured(): void {
  if (!CONFIG.KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY is required for provider-backed agent execution.');
  }
}
