import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { z } from 'zod';

/**
 * Tool definition for MCP capabilities
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Unique tool name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodType<TInput>;
  /** Optional output schema for structured responses */
  outputSchema?: z.ZodType<TOutput>;
  /** Tool handler function */
  handler: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  /** Server instance for accessing other capabilities */
  server: Server;
  /** Logger for structured logging */
  logger: Logger;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result from a tool execution
 */
export interface ToolResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Content to return to the LLM */
  content: ToolContent[];
  /** Structured output data (optional) */
  structuredContent?: T;
  /** Whether this is an error result */
  isError?: boolean;
}

/**
 * Content types for tool responses
 */
export type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string } };

/**
 * Resource definition for MCP capabilities
 */
export interface ResourceDefinition {
  /** Resource URI pattern (supports templates like {id}) */
  uriTemplate: string;
  /** Human-readable name */
  name: string;
  /** Description of the resource */
  description: string;
  /** MIME type of the resource content */
  mimeType?: string;
  /** Handler to read the resource */
  handler: (uri: string, context: ResourceContext) => Promise<ResourceResult>;
}

/**
 * Context passed to resource handlers
 */
export interface ResourceContext {
  /** Server instance */
  server: Server;
  /** Logger for structured logging */
  logger: Logger;
  /** Parsed URI parameters */
  params: Record<string, string>;
}

/**
 * Result from reading a resource
 */
export interface ResourceResult {
  /** Resource contents */
  contents: ResourceContent[];
}

/**
 * Individual resource content
 */
export interface ResourceContent {
  /** Resource URI */
  uri: string;
  /** MIME type */
  mimeType?: string;
  /** Text content (for text resources) */
  text?: string;
  /** Binary content as base64 (for binary resources) */
  blob?: string;
}

/**
 * Prompt definition for MCP capabilities
 */
export interface PromptDefinition {
  /** Unique prompt name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Arguments the prompt accepts */
  arguments?: PromptArgument[];
  /** Handler to generate prompt messages */
  handler: (args: Record<string, string>, context: PromptContext) => Promise<PromptResult>;
}

/**
 * Prompt argument definition
 */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Description */
  description?: string;
  /** Whether the argument is required */
  required?: boolean;
}

/**
 * Context passed to prompt handlers
 */
export interface PromptContext {
  /** Server instance */
  server: Server;
  /** Logger */
  logger: Logger;
}

/**
 * Result from getting a prompt
 */
export interface PromptResult {
  /** Prompt description */
  description?: string;
  /** Messages to return */
  messages: PromptMessage[];
}

/**
 * Individual prompt message
 */
export interface PromptMessage {
  /** Role (user or assistant) */
  role: 'user' | 'assistant';
  /** Message content */
  content: PromptMessageContent;
}

/**
 * Prompt message content
 */
export type PromptMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; text?: string; mimeType?: string } };

/**
 * Capability module interface - the core abstraction for MCP capabilities
 */
export interface CapabilityModule {
  /** Unique capability identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version string */
  version: string;
  /** Description */
  description: string;
  /** Tools provided by this capability */
  tools?: ToolDefinition[];
  /** Resources provided by this capability */
  resources?: ResourceDefinition[];
  /** Prompts provided by this capability */
  prompts?: PromptDefinition[];
  /** Initialize the capability (called once at startup) */
  initialize?: (context: CapabilityContext) => Promise<void>;
  /** Cleanup the capability (called on shutdown) */
  cleanup?: () => Promise<void>;
  /** Health check function */
  healthCheck?: () => Promise<HealthStatus>;
}

/**
 * Context passed to capability initialization
 */
export interface CapabilityContext {
  /** Server instance */
  server: Server;
  /** Logger */
  logger: Logger;
  /** Configuration for this capability */
  config: Record<string, unknown>;
}

/**
 * Logger interface for structured logging
 */
export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Health status for capability health checks
 */
export interface HealthStatus {
  /** Whether the capability is healthy */
  healthy: boolean;
  /** Status message */
  message?: string;
  /** Detailed status information */
  details?: Record<string, unknown>;
  /** Last check timestamp */
  timestamp: Date;
}
