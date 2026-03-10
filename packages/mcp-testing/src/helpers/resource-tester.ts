import type {
  ResourceDefinition,
  ResourceResult,
  ResourceContext,
  Logger,
} from '@vibetech/mcp-core';
import { noopLogger } from '@vibetech/mcp-core';

/**
 * Resource test result with metadata
 */
export interface ResourceTestResult extends ResourceResult {
  /** Execution time in ms */
  durationMs: number;
  /** Whether the resource was found */
  found: boolean;
  /** Matched URI parameters */
  params?: Record<string, string>;
}

/**
 * Resource tester options
 */
export interface ResourceTesterOptions {
  /** Logger instance */
  logger?: Logger;
  /** Default timeout in ms */
  timeout?: number;
}

/**
 * Helper class for testing MCP resources
 */
export class ResourceTester {
  private resources = new Map<string, ResourceDefinition>();
  private logger: Logger;
  private timeout: number;

  constructor(options: ResourceTesterOptions = {}) {
    this.logger = options.logger ?? noopLogger;
    this.timeout = options.timeout ?? 30000;
  }

  /**
   * Register a resource for testing
   */
  register(resource: ResourceDefinition): this {
    this.resources.set(resource.uriTemplate, resource);
    return this;
  }

  /**
   * Register multiple resources
   */
  registerAll(resources: ResourceDefinition[]): this {
    resources.forEach(r => this.register(r));
    return this;
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<ResourceTestResult> {
    const start = Date.now();

    // Find matching resource
    let matchedResource: ResourceDefinition | undefined;
    let params: Record<string, string> = {};

    for (const [template, resource] of this.resources) {
      const match = this.matchTemplate(template, uri);
      if (match) {
        matchedResource = resource;
        params = match;
        break;
      }
    }

    if (!matchedResource) {
      return {
        contents: [],
        durationMs: Date.now() - start,
        found: false,
      };
    }

    // Create mock context
    const context: ResourceContext = {
      server: {} as any,
      logger: this.logger,
      params,
    };

    try {
      const result = await Promise.race([
        matchedResource.handler(uri, context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Resource read timeout')), this.timeout)
        ),
      ]);

      return {
        ...result,
        durationMs: Date.now() - start,
        found: true,
        params,
      };
    } catch (error) {
      return {
        contents: [],
        durationMs: Date.now() - start,
        found: true,
        params,
      };
    }
  }

  /**
   * Test that a resource returns content
   */
  async testHasContent(uri: string): Promise<{
    passed: boolean;
    result?: ResourceTestResult;
    error?: string;
  }> {
    const result = await this.readResource(uri);

    if (!result.found) {
      return {
        passed: false,
        result,
        error: `Resource not found for URI: ${uri}`,
      };
    }

    if (result.contents.length === 0) {
      return {
        passed: false,
        result,
        error: 'Resource found but returned no contents',
      };
    }

    return { passed: true, result };
  }

  /**
   * Test that a resource matches expected content
   */
  async testContentMatches(
    uri: string,
    predicate: (contents: ResourceResult['contents']) => boolean
  ): Promise<{
    passed: boolean;
    result?: ResourceTestResult;
    error?: string;
  }> {
    const result = await this.readResource(uri);

    if (!result.found) {
      return {
        passed: false,
        result,
        error: `Resource not found for URI: ${uri}`,
      };
    }

    if (!predicate(result.contents)) {
      return {
        passed: false,
        result,
        error: 'Content did not match predicate',
      };
    }

    return { passed: true, result };
  }

  /**
   * Test that a resource returns specific text
   */
  async testTextContains(uri: string, expectedText: string): Promise<{
    passed: boolean;
    result?: ResourceTestResult;
    error?: string;
  }> {
    return this.testContentMatches(uri, contents =>
      contents.some(c => c.text?.includes(expectedText))
    );
  }

  /**
   * Test URI template matching
   */
  testTemplateMatch(template: string, uri: string): {
    matches: boolean;
    params?: Record<string, string>;
  } {
    const params = this.matchTemplate(template, uri);
    return {
      matches: params !== null,
      params: params ?? undefined,
    };
  }

  /**
   * List all registered resources
   */
  listResources(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Clear all registered resources
   */
  clear(): void {
    this.resources.clear();
  }

  private matchTemplate(template: string, uri: string): Record<string, string> | null {
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
}

/**
 * Create a resource tester with resources pre-registered
 */
export function createResourceTester(
  resources: ResourceDefinition[],
  options?: ResourceTesterOptions
): ResourceTester {
  const tester = new ResourceTester(options);
  tester.registerAll(resources);
  return tester;
}
