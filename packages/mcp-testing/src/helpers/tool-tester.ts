import type {
  ToolDefinition,
  ToolResult,
  ToolContext,
  Logger,
} from '@vibetech/mcp-core';
import { noopLogger, validateInput } from '@vibetech/mcp-core';

/**
 * Tool test result with additional metadata
 */
export interface ToolTestResult extends ToolResult {
  /** Execution time in ms */
  durationMs: number;
  /** Validation passed */
  validationPassed: boolean;
  /** Validation errors if any */
  validationErrors?: string[];
}

/**
 * Tool tester options
 */
export interface ToolTesterOptions {
  /** Logger instance */
  logger?: Logger;
  /** Default timeout in ms */
  timeout?: number;
}

/**
 * Helper class for testing MCP tools
 */
export class ToolTester {
  private tools = new Map<string, ToolDefinition>();
  private logger: Logger;
  private timeout: number;

  constructor(options: ToolTesterOptions = {}) {
    this.logger = options.logger ?? noopLogger;
    this.timeout = options.timeout ?? 30000;
  }

  /**
   * Register a tool for testing
   */
  register(tool: ToolDefinition): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: ToolDefinition[]): this {
    tools.forEach(t => this.register(t));
    return this;
  }

  /**
   * Call a registered tool
   */
  async callTool(name: string, input: unknown): Promise<ToolTestResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
        durationMs: 0,
        validationPassed: false,
      };
    }

    const start = Date.now();

    // Validate input
    const validationResult = validateInput(tool.inputSchema, input);
    if (!validationResult.success) {
      return {
        success: false,
        content: [{ type: 'text', text: `Validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}` }],
        isError: true,
        durationMs: Date.now() - start,
        validationPassed: false,
        validationErrors: validationResult.errors?.map(e => e.message),
      };
    }

    // Create mock context
    const context: ToolContext = {
      server: {} as any,
      logger: this.logger,
    };

    try {
      // Execute with timeout
      const result = await Promise.race([
        tool.handler(validationResult.data, context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timeout')), this.timeout)
        ),
      ]);

      return {
        ...result,
        durationMs: Date.now() - start,
        validationPassed: true,
      };
    } catch (error) {
      return {
        success: false,
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
        durationMs: Date.now() - start,
        validationPassed: true,
      };
    }
  }

  /**
   * Test that a tool validates input correctly
   */
  async testValidation(name: string, invalidInput: unknown, expectedError?: string): Promise<{
    passed: boolean;
    error?: string;
  }> {
    const result = await this.callTool(name, invalidInput);
    
    if (result.validationPassed) {
      return {
        passed: false,
        error: 'Expected validation to fail but it passed',
      };
    }

    if (expectedError && !result.validationErrors?.some(e => e.includes(expectedError))) {
      return {
        passed: false,
        error: `Expected error containing "${expectedError}" but got: ${result.validationErrors?.join(', ')}`,
      };
    }

    return { passed: true };
  }

  /**
   * Test that a tool succeeds with valid input
   */
  async testSuccess(name: string, validInput: unknown): Promise<{
    passed: boolean;
    result?: ToolTestResult;
    error?: string;
  }> {
    const result = await this.callTool(name, validInput);

    if (!result.success || result.isError) {
      return {
        passed: false,
        result,
        error: `Expected success but got error: ${result.content[0]?.type === 'text' ? result.content[0].text : 'unknown'}`,
      };
    }

    return { passed: true, result };
  }

  /**
   * Test that a tool fails with an error
   */
  async testError(name: string, input: unknown, expectedError?: string): Promise<{
    passed: boolean;
    result?: ToolTestResult;
    error?: string;
  }> {
    const result = await this.callTool(name, input);

    if (result.success && !result.isError) {
      return {
        passed: false,
        result,
        error: 'Expected error but operation succeeded',
      };
    }

    if (expectedError) {
      const errorText = result.content[0]?.type === 'text' ? result.content[0].text : '';
      if (!errorText.includes(expectedError)) {
        return {
          passed: false,
          result,
          error: `Expected error containing "${expectedError}" but got: ${errorText}`,
        };
      }
    }

    return { passed: true, result };
  }

  /**
   * Get a registered tool
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Create a tool tester with tools pre-registered
 */
export function createToolTester(tools: ToolDefinition[], options?: ToolTesterOptions): ToolTester {
  const tester = new ToolTester(options);
  tester.registerAll(tools);
  return tester;
}
