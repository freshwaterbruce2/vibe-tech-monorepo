import { z } from 'zod';

/**
 * Server configuration schema
 */
export const ServerConfigSchema = z.object({
  /** Server name */
  name: z.string().default('vibetech-mcp-server'),
  /** Server version */
  version: z.string().default('1.0.0'),
  /** Server description */
  description: z.string().optional(),
  /** Transport type */
  transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  /** HTTP port (for http/sse transport) */
  port: z.number().optional(),
  /** Host to bind to (for http/sse transport) */
  host: z.string().optional(),
  /** Log level */
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** Enabled capabilities */
  capabilities: z.object({
    codeRetriever: z.boolean().default(false),
    memoryBank: z.boolean().default(false),
    skills: z.boolean().default(false),
    sseBridge: z.boolean().default(false),
  }).default({
    codeRetriever: false,
    memoryBank: false,
    skills: false,
    sseBridge: false,
  }),
  /** Capability-specific configuration */
  capabilityConfig: z.record(z.string(), z.unknown()).default({}),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Code retriever capability configuration
 */
export const CodeRetrieverConfigSchema = z.object({
  /** Root directory to search */
  rootDir: z.string(),
  /** File patterns to include */
  includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']),
  /** File patterns to exclude */
  excludePatterns: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/.git/**']),
  /** Maximum file size to index (bytes) */
  maxFileSize: z.number().default(1024 * 1024), // 1MB
  /** Maximum search results */
  maxResults: z.number().default(50),
});

export type CodeRetrieverConfig = z.infer<typeof CodeRetrieverConfigSchema>;

/**
 * Memory bank capability configuration
 */
export const MemoryBankConfigSchema = z.object({
  /** Database path */
  dbPath: z.string(),
  /** Maximum memory entries */
  maxEntries: z.number().default(10000),
  /** Enable embeddings */
  enableEmbeddings: z.boolean().default(false),
  /** Embedding model */
  embeddingModel: z.string().optional(),
  /** API key for embeddings */
  embeddingApiKey: z.string().optional(),
});

export type MemoryBankConfig = z.infer<typeof MemoryBankConfigSchema>;

/**
 * Skills capability configuration
 */
export const SkillsConfigSchema = z.object({
  /** Skills directory */
  skillsDir: z.string(),
  /** Enable hot reload */
  hotReload: z.boolean().default(false),
  /** Allowed skill IDs (empty = all) */
  allowedSkills: z.array(z.string()).default([]),
});

export type SkillsConfig = z.infer<typeof SkillsConfigSchema>;

/**
 * SSE bridge capability configuration
 */
export const SSEBridgeConfigSchema = z.object({
  /** Target MCP servers to bridge */
  targets: z.array(z.object({
    /** Target name */
    name: z.string(),
    /** Target command */
    command: z.string(),
    /** Target arguments */
    args: z.array(z.string()).default([]),
    /** Environment variables */
    env: z.record(z.string(), z.string()).default({}),
  })),
  /** Connection timeout (ms) */
  connectionTimeout: z.number().default(30000),
  /** Request timeout (ms) */
  requestTimeout: z.number().default(60000),
});

export type SSEBridgeConfig = z.infer<typeof SSEBridgeConfigSchema>;

/**
 * Full configuration combining all capability configs
 */
export const FullConfigSchema = ServerConfigSchema.extend({
  codeRetriever: CodeRetrieverConfigSchema.optional(),
  memoryBank: MemoryBankConfigSchema.optional(),
  skills: SkillsConfigSchema.optional(),
  sseBridge: SSEBridgeConfigSchema.optional(),
});

export type FullConfig = z.infer<typeof FullConfigSchema>;

/**
 * Load configuration from environment and/or file
 */
export function loadConfig(overrides?: Partial<FullConfig>): FullConfig {
  const envConfig: Partial<FullConfig> = {
    name: process.env.MCP_SERVER_NAME,
    version: process.env.MCP_SERVER_VERSION,
    logLevel: process.env.MCP_LOG_LEVEL as FullConfig['logLevel'],
    transport: process.env.MCP_TRANSPORT as FullConfig['transport'],
    port: process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : undefined,
    host: process.env.MCP_HOST,
  };

  // Remove undefined values without dynamic delete
  const sanitizedEnvConfig = Object.fromEntries(
    Object.entries(envConfig).filter(([, value]) => value !== undefined)
  ) as Partial<FullConfig>;

  const merged = { ...sanitizedEnvConfig, ...overrides };
  return FullConfigSchema.parse(merged);
}
