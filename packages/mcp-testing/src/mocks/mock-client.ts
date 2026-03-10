import type {
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
  ToolResult,
  ResourceResult,
  PromptResult,
  Logger,
} from '@vibetech/mcp-core';
import { noopLogger } from '@vibetech/mcp-core';

/**
 * Mock MCP client options
 */
export interface MockClientOptions {
  /** Auto-approve tool calls */
  autoApprove?: boolean;
  /** Request timeout in ms */
  timeout?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Call log entry for tracking interactions
 */
export interface CallLogEntry {
  method: string;
  params: unknown;
  response: unknown;
  timestamp: Date;
  durationMs: number;
}

/**
 * Registered tool entry
 */
interface RegisteredTool {
  definition: ToolDefinition;
}

/**
 * Registered resource entry
 */
interface RegisteredResource {
  definition: ResourceDefinition;
}

/**
 * Registered prompt entry
 */
interface RegisteredPrompt {
  definition: PromptDefinition;
}

/**
 * Mock MCP client for testing
 * Simulates an MCP client interacting with registered tools/resources/prompts
 */
export class MockMcpClient {
  private tools = new Map<string, RegisteredTool>();
  private resources = new Map<string, RegisteredResource>();
  private prompts = new Map<string, RegisteredPrompt>();
  private callLog: CallLogEntry[] = [];
  private options: Required<MockClientOptions>;
  private logger: Logger;
  private initialized = false;

  constructor(options: MockClientOptions = {}) {
    this.options = {
      autoApprove: options.autoApprove ?? true,
      timeout: options.timeout ?? 30000,
      logger: options.logger ?? noopLogger,
    };
    this.logger = this.options.logger;
  }

  /**
   * Register a tool for testing
   */
  registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.name, { definition });
    this.logger.debug('Tool registered', { name: definition.name });
  }

  /**
   * Register multiple tools
   */
  registerTools(definitions: ToolDefinition[]): void {
    definitions.forEach(d => this.registerTool(d));
  }

  /**
   * Register a resource for testing
   */
  registerResource(definition: ResourceDefinition): void {
    this.resources.set(definition.uriTemplate, { definition });
    this.logger.debug('Resource registered', { uri: definition.uriTemplate });
  }

  /**
   * Register multiple resources
   */
  registerResources(definitions: ResourceDefinition[]): void {
    definitions.forEach(d => this.registerResource(d));
  }

  /**
   * Register a prompt for testing
   */
  registerPrompt(definition: PromptDefinition): void {
    this.prompts.set(definition.name, { definition });
    this.logger.debug('Prompt registered', { name: definition.name });
  }

  /**
   * Register multiple prompts
   */
  registerPrompts(definitions: PromptDefinition[]): void {
    definitions.forEach(d => this.registerPrompt(d));
  }

  /**
   * Simulate client initialization
   */
  async initialize(): Promise<{ protocolVersion: string; capabilities: object }> {
    const start = Date.now();
    
    const response = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: this.tools.size > 0,
        resources: this.resources.size > 0,
        prompts: this.prompts.size > 0,
      },
    };

    this.logCall('initialize', {}, response, Date.now() - start);
    this.initialized = true;
    
    return response;
  }

  /**
   * List all registered tools
   */
  async listTools(): Promise<Array<{ name: string; description: string }>> {
    const start = Date.now();
    
    const tools = Array.from(this.tools.values()).map(t => ({
      name: t.definition.name,
      description: t.definition.description,
    }));

    this.logCall('tools/list', {}, { tools }, Date.now() - start);
    
    return tools;
  }

  /**
   * Call a tool with arguments
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const start = Date.now();
    
    const tool = this.tools.get(name);
    if (!tool) {
      const error = { success: false, content: [{ type: 'text' as const, text: `Tool not found: ${name}` }], isError: true };
      this.logCall('tools/call', { name, arguments: args }, error, Date.now() - start);
      return error;
    }

    try {
      // Validate input
      const parsed = tool.definition.inputSchema.safeParse(args);
      if (!parsed.success) {
        const error = {
          success: false,
          content: [{ type: 'text' as const, text: `Validation error: ${parsed.error.message}` }],
          isError: true,
        };
        this.logCall('tools/call', { name, arguments: args }, error, Date.now() - start);
        return error;
      }

      // Execute handler
      const mockContext = {
        server: {} as any,
        logger: this.logger,
      };
      
      const result = await tool.definition.handler(parsed.data, mockContext);
      this.logCall('tools/call', { name, arguments: args }, result, Date.now() - start);
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
      this.logCall('tools/call', { name, arguments: args }, errorResult, Date.now() - start);
      return errorResult;
    }
  }

  /**
   * List all registered resources
   */
  async listResources(): Promise<Array<{ uri: string; name: string }>> {
    const start = Date.now();
    
    const resources = Array.from(this.resources.values()).map(r => ({
      uri: r.definition.uriTemplate,
      name: r.definition.name,
    }));

    this.logCall('resources/list', {}, { resources }, Date.now() - start);
    
    return resources;
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<ResourceResult> {
    const start = Date.now();
    
    // Find matching resource
    let matchedResource: RegisteredResource | undefined;
    let params: Record<string, string> = {};

    for (const [template, resource] of this.resources) {
      const match = matchUriTemplate(template, uri);
      if (match) {
        matchedResource = resource;
        params = match;
        break;
      }
    }

    if (!matchedResource) {
      const error = { contents: [] };
      this.logCall('resources/read', { uri }, error, Date.now() - start);
      return error;
    }

    try {
      const mockContext = {
        server: {} as any,
        logger: this.logger,
        params,
      };
      
      const result = await matchedResource.definition.handler(uri, mockContext);
      this.logCall('resources/read', { uri }, result, Date.now() - start);
      
      return result;
    } catch (error) {
      const errorResult = { contents: [] };
      this.logCall('resources/read', { uri }, errorResult, Date.now() - start);
      return errorResult;
    }
  }

  /**
   * List all registered prompts
   */
  async listPrompts(): Promise<Array<{ name: string; description: string }>> {
    const start = Date.now();
    
    const prompts = Array.from(this.prompts.values()).map(p => ({
      name: p.definition.name,
      description: p.definition.description,
    }));

    this.logCall('prompts/list', {}, { prompts }, Date.now() - start);
    
    return prompts;
  }

  /**
   * Get a prompt with arguments
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<PromptResult> {
    const start = Date.now();
    
    const prompt = this.prompts.get(name);
    if (!prompt) {
      const error = { messages: [] };
      this.logCall('prompts/get', { name, arguments: args }, error, Date.now() - start);
      return error;
    }

    try {
      const mockContext = {
        server: {} as any,
        logger: this.logger,
      };
      
      const result = await prompt.definition.handler(args ?? {}, mockContext);
      this.logCall('prompts/get', { name, arguments: args }, result, Date.now() - start);
      
      return result;
    } catch (error) {
      const errorResult = { messages: [] };
      this.logCall('prompts/get', { name, arguments: args }, errorResult, Date.now() - start);
      return errorResult;
    }
  }

  /**
   * Get the call log
   */
  getCallLog(): CallLogEntry[] {
    return [...this.callLog];
  }

  /**
   * Clear the call log
   */
  clearCallLog(): void {
    this.callLog = [];
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset the client state
   */
  reset(): void {
    this.tools.clear();
    this.resources.clear();
    this.prompts.clear();
    this.callLog = [];
    this.initialized = false;
  }

  private logCall(method: string, params: unknown, response: unknown, durationMs: number): void {
    this.callLog.push({
      method,
      params,
      response,
      timestamp: new Date(),
      durationMs,
    });
  }
}

/**
 * Match a URI against a template with parameters
 */
function matchUriTemplate(template: string, uri: string): Record<string, string> | null {
  // Simple template matching: {param} style
  const templateParts = template.split('/');
  const uriParts = uri.split('/');

  if (templateParts.length !== uriParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < templateParts.length; i++) {
    const templatePart = templateParts[i];
    const uriPart = uriParts[i];
    if (templatePart === undefined || uriPart === undefined) {
      return null;
    }

    if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
      const paramName = templatePart.slice(1, -1);
      params[paramName] = uriPart;
    } else if (templatePart !== uriPart) {
      return null;
    }
  }

  return params;
}
