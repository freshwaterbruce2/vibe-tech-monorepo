/**
 * @vibetech/shared-utils/webmcp
 * Web Model Context Protocol (WebMCP) Integration Library
 * Provides standard polyfills, declarative form parser, and bridges.
 */

// Types matching the W3C Web Machine Learning CG WebMCP drafts
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  // Method syntax keeps parameter checking bivariant so callers can register
  // tools whose execute takes a narrower, schema-specific args shape.
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/** JSON Schema property generated from a single HTML form field. */
export interface FormFieldSchema {
  type: string;
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  format?: string;
}

/** JSON Schema generated from a declarative HTML form tool. */
export interface FormToolSchema {
  type: 'object';
  properties: Record<string, FormFieldSchema>;
  required?: string[];
  additionalProperties: boolean;
}

export interface RegisterToolOptions {
  signal?: AbortSignal;
  /** Origins allowed to call this tool from cross-origin iframes (spec: exposedTo). */
  exposedTo?: string[];
}

export interface ModelContext {
  registerTool(tool: ToolDefinition, options?: RegisterToolOptions): void;
}

/**
 * Browser-provided model context surface (Chrome 149+ origin trial).
 * Members beyond registerTool are optional because the trial API surface
 * is still evolving; every native call site must stay defensive.
 */
interface NativeModelContext {
  registerTool(tool: ToolDefinition, options?: RegisterToolOptions): void;
  addEventListener?(type: string, listener: () => void): void;
}

/**
 * Polyfilled document.modelContext: spec-shaped object that is also an
 * EventTarget so consumers can listen for 'toolchange' exactly like the
 * native API instead of needing the manager's subscribe().
 */
class PolyfillModelContext extends EventTarget implements ModelContext {
  constructor(
    private readonly delegate: (tool: ToolDefinition, options?: RegisterToolOptions) => void
  ) {
    super();
  }

  registerTool(tool: ToolDefinition, options?: RegisterToolOptions): void {
    this.delegate(tool, options);
  }
}

// Extends WebMCP submit event interface
export interface WebMCPSubmitEvent extends Event {
  readonly agentInvoked: boolean;
  respondWith(promise: Promise<unknown>): void;
}

interface ImperativeRegistryEntry {
  tool: ToolDefinition;
  options?: RegisterToolOptions;
}

/**
 * WebMCPManager manages imperative tools and declarative forms,
 * acting as the core engine in the browser/renderer environment.
 */
export class WebMCPManager {
  private static instance: WebMCPManager | null = null;
  private imperativeTools = new Map<string, ImperativeRegistryEntry>();
  private observer: MutationObserver | null = null;
  private isScanning = false;
  private listeners = new Set<() => void>();
  private nativeContext: NativeModelContext | null = null;
  private polyfillContext: PolyfillModelContext | null = null;

  private constructor() {
    this.setupPolyfill();
  }

  static getInstance(): WebMCPManager {
    WebMCPManager.instance ??= new WebMCPManager();
    return WebMCPManager.instance;
  }

  /**
   * Detect a native document.modelContext (Chrome 149+ origin trial) or
   * install the polyfill on document and navigator when absent.
   */
  private setupPolyfill(): void {
    if (typeof window === 'undefined') return;

    if ('modelContext' in document) {
      // Native WebMCP: registrations are delegated to the browser and
      // mirrored locally so listTools/executeTool keep working for
      // inspection and the MCP bridge.
      this.nativeContext = (document as Document & { modelContext: NativeModelContext }).modelContext;
      this.nativeContext.addEventListener?.('toolchange', () => {
        for (const listener of this.listeners) {
          listener();
        }
      });

      // Deprecated alias for consumers still reading navigator.modelContext
      if (typeof navigator !== 'undefined' && !('modelContext' in navigator)) {
        Object.defineProperty(navigator, 'modelContext', {
          value: this.nativeContext,
          writable: true,
          configurable: true
        });
      }
      return;
    }

    this.polyfillContext = new PolyfillModelContext((tool, options) => {
      this.registerImperativeTool(tool, options);
    });

    Object.defineProperty(document, 'modelContext', {
      value: this.polyfillContext,
      writable: true,
      configurable: true
    });

    // Deprecated alias navigator.modelContext for backward compatibility
    if (typeof navigator !== 'undefined' && !('modelContext' in navigator)) {
      Object.defineProperty(navigator, 'modelContext', {
        value: this.polyfillContext,
        writable: true,
        configurable: true
      });
    }
  }

  /**
   * True when the browser provided document.modelContext itself,
   * false when this manager installed the polyfill.
   */
  hasNativeModelContext(): boolean {
    return this.nativeContext !== null;
  }

  /**
   * Subscribe to tool registry changes (register, unregister, DOM mutations
   * affecting declarative forms). Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyToolsChanged(): void {
    for (const listener of this.listeners) {
      listener();
    }
    // Mirror the native 'toolchange' event so polyfill consumers can use
    // the spec-shaped EventTarget API.
    this.polyfillContext?.dispatchEvent(new Event('toolchange'));
  }

  /**
   * Registers a tool programmatically (Imperative API)
   */
  registerImperativeTool(tool: ToolDefinition, options?: RegisterToolOptions): void {
    const { name } = tool;

    // Handle AbortSignal for unregistering (modern April 2026 approach)
    if (options?.signal) {
      if (options.signal.aborted) return;
      options.signal.addEventListener('abort', () => {
        this.imperativeTools.delete(name);
        this.notifyToolsChanged();
      });
    }

    this.imperativeTools.set(name, { tool, options });

    if (this.nativeContext) {
      try {
        this.nativeContext.registerTool(tool, options);
      } catch {
        // Native registration is best-effort: the local registry still
        // serves listTools/executeTool, so a trial API rejecting options
        // it does not yet support must not break callers.
      }
    }

    this.notifyToolsChanged();
  }

  /**
   * Scans the DOM for declarative form tools
   */
  getDeclarativeTools(): Map<string, { form: HTMLFormElement; description: string; schema: FormToolSchema }> {
    const declarative = new Map<string, { form: HTMLFormElement; description: string; schema: FormToolSchema }>();
    if (typeof document === 'undefined') return declarative;

    // Array.from: downstream composite builds compile this file without
    // DOM.Iterable in lib, where NodeListOf is not directly iterable.
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[toolname]'));
    for (const form of forms) {
      const name = form.getAttribute('toolname');
      const description = form.getAttribute('tooldescription') ?? '';
      if (!name) continue;

      const schema = this.generateSchemaFromForm(form);
      declarative.set(name, { form, description, schema });
    }

    return declarative;
  }

  /**
   * Start observing the DOM for dynamic declarative tools
   */
  startScanning(onUpdate?: () => void): void {
    if (typeof window === 'undefined' || this.isScanning) return;
    this.isScanning = true;

    this.observer = new MutationObserver(() => {
      this.notifyToolsChanged();
      if (onUpdate) onUpdate();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['toolname', 'tooldescription', 'toolparamdescription']
    });
  }

  /**
   * Stop DOM observer scanning
   */
  stopScanning(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isScanning = false;
  }

  /**
   * Extract JSON Schema from HTML form fields
   */
  private generateSchemaFromForm(form: HTMLFormElement): FormToolSchema {
    const properties: Record<string, FormFieldSchema> = {};
    const required: string[] = [];

    const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    ));

    for (const field of fields) {
      const name = field.name || field.id;
      if (!name) continue;

      // Skip submit elements
      if (field instanceof HTMLInputElement && (field.type === 'submit' || field.type === 'button')) {
        continue;
      }

      const placeholder = 'placeholder' in field ? field.placeholder : '';
      const description = field.getAttribute('toolparamdescription') ?? (placeholder || field.title);
      let schemaType = 'string';
      const extraProps: Partial<FormFieldSchema> = {};

      const tagName = field.tagName.toLowerCase();
      if (tagName === 'select') {
        schemaType = 'string';
        const select = field as HTMLSelectElement;
        const options = Array.from(select.options).map(o => o.value || o.text);
        if (options.length > 0) {
          extraProps.enum = options;
        }
      } else if (tagName === 'input') {
        const input = field as HTMLInputElement;
        if (input.type === 'number' || input.type === 'range') {
          schemaType = 'number';
          const minVal = input.getAttribute('min');
          const maxVal = input.getAttribute('max');
          if (minVal !== null) extraProps.minimum = Number(minVal);
          if (maxVal !== null) extraProps.maximum = Number(maxVal);
        } else if (input.type === 'checkbox') {
          schemaType = 'boolean';
        } else if (input.type === 'date' || input.type === 'time') {
          schemaType = 'string';
          extraProps.format = input.type;
        }
      }

      properties[name] = {
        type: schemaType,
        description,
        ...extraProps
      };

      if (field.hasAttribute('required')) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false
    };
  }

  /**
   * Lists all available tools (both imperative and declarative) in standard format
   */
  listTools(): Array<{ name: string; description: string; inputSchema: Record<string, unknown>; type: 'imperative' | 'declarative' }> {
    const toolsList: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; type: 'imperative' | 'declarative' }> = [];

    // Imperative tools
    for (const [name, entry] of this.imperativeTools.entries()) {
      toolsList.push({
        name,
        description: entry.tool.description,
        inputSchema: entry.tool.inputSchema,
        type: 'imperative'
      });
    }

    // Declarative tools
    const declarative = this.getDeclarativeTools();
    for (const [name, entry] of declarative.entries()) {
      toolsList.push({
        name,
        description: entry.description,
        // Spread to a fresh object literal: FormToolSchema is an interface
        // without an index signature, so it is not directly assignable to
        // Record<string, unknown>.
        inputSchema: { ...entry.schema },
        type: 'declarative'
      });
    }

    return toolsList;
  }

  /**
   * Executes a tool by name with arguments
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // 1. Try imperative first
    const impEntry = this.imperativeTools.get(name);
    if (impEntry) {
      return impEntry.tool.execute(args);
    }

    // 2. Try declarative forms
    const decTools = this.getDeclarativeTools();
    const decEntry = decTools.get(name);
    if (decEntry) {
      return this.executeDeclarativeForm(decEntry.form, args);
    }

    throw new Error(`WebMCP: Tool "${name}" not found`);
  }

  /**
   * Fills and dispatches standard submit event on an HTML Form
   */
  private async executeDeclarativeForm(form: HTMLFormElement, args: Record<string, unknown>): Promise<unknown> {
    const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    ));

    // Populate fields and dispatch input/change events for SPA reactivity
    for (const field of fields) {
      const fieldName = field.name || field.id;
      if (!fieldName || !(fieldName in args)) continue;

      const val = args[fieldName];

      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        field.checked = Boolean(val);
      } else {
        field.value = String(val);
      }

      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Visual feedback classes
    form.classList.add('tool-form-active');
    const submitBtn = form.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      submitBtn.classList.add('tool-submit-active');
    }

    const cleanup = () => {
      form.classList.remove('tool-form-active');
      if (submitBtn) {
        submitBtn.classList.remove('tool-submit-active');
      }
    };

    // Setup custom SubmitEvent with respondWith capability. A holder object is
    // used because the assignment happens synchronously inside respondWith
    // during dispatchEvent, which flow analysis cannot see for a plain local.
    const response: { pending: Promise<unknown> | null } = { pending: null };
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });

    Object.defineProperties(submitEvent, {
      agentInvoked: { value: true, enumerable: true },
      respondWith: {
        value: (promise: Promise<unknown>) => {
          response.pending = promise;
        },
        enumerable: true
      }
    });

    const defaultPrevented = !form.dispatchEvent(submitEvent);

    if (response.pending) {
      try {
        const result = await response.pending;
        cleanup();
        return result;
      } catch (err) {
        cleanup();
        throw err;
      }
    } else {
      if (!defaultPrevented && form.hasAttribute('toolautosubmit')) {
        form.submit();
        cleanup();
        return { success: true, submitted: true };
      }
      cleanup();
      return { success: true, submitted: !defaultPrevented };
    }
  }
}

/** MCP CallToolResult-shaped response (matches @modelcontextprotocol/sdk). */
export interface McpToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** Executable MCP tool descriptor bridged from the WebMCP registry. */
export interface McpBridgedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler(args: Record<string, unknown>): Promise<McpToolCallResult>;
}

/**
 * Creates executable MCP SDK tool mappings from the WebMCP registry.
 * Each handler runs the underlying WebMCP tool and wraps the outcome in
 * MCP CallToolResult shape, so the array can directly back an MCP server's
 * ListTools/CallTool handlers.
 */
export function getStandardMcpToolsBridge(): McpBridgedTool[] {
  const manager = WebMCPManager.getInstance();
  return manager.listTools().map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    handler: async (args: Record<string, unknown>): Promise<McpToolCallResult> => {
      try {
        const result = await manager.executeTool(t.name, args);
        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result ?? null)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  }));
}
