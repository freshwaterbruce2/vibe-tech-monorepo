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
export type FormFieldSchema = {
  type: string;
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  format?: string;
};

/** JSON Schema generated from a declarative HTML form tool. */
export type FormToolSchema = {
  type: 'object';
  properties: Record<string, FormFieldSchema>;
  required?: string[];
  additionalProperties: boolean;
};

export interface RegisterToolOptions {
  signal?: AbortSignal;
}

export interface ModelContext {
  registerTool(tool: ToolDefinition, options?: RegisterToolOptions): void;
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

  private constructor() {
    this.setupPolyfill();
  }

  static getInstance(): WebMCPManager {
    if (!WebMCPManager.instance) {
      WebMCPManager.instance = new WebMCPManager();
    }
    return WebMCPManager.instance;
  }

  /**
   * Inject navigator.modelContext and document.modelContext polyfills
   */
  private setupPolyfill(): void {
    if (typeof window === 'undefined') return;

    const modelContext: ModelContext = {
      registerTool: (tool: ToolDefinition, options?: RegisterToolOptions) => {
        this.registerImperativeTool(tool, options);
      }
    };

    // Chrome 150+ standard is document.modelContext
    if (!('modelContext' in document)) {
      Object.defineProperty(document, 'modelContext', {
        value: modelContext,
        writable: true,
        configurable: true
      });
    }

    // Deprecated alias navigator.modelContext for backward compatibility
    if (typeof navigator !== 'undefined' && !('modelContext' in navigator)) {
      Object.defineProperty(navigator, 'modelContext', {
        value: modelContext,
        writable: true,
        configurable: true
      });
    }
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
      });
    }

    this.imperativeTools.set(name, { tool, options });
  }

  /**
   * Scans the DOM for declarative form tools
   */
  getDeclarativeTools(): Map<string, { form: HTMLFormElement; description: string; schema: FormToolSchema }> {
    const declarative = new Map<string, { form: HTMLFormElement; description: string; schema: FormToolSchema }>();
    if (typeof document === 'undefined') return declarative;

    const forms = document.querySelectorAll<HTMLFormElement>('form[toolname]');
    for (const form of forms) {
      const name = form.getAttribute('toolname');
      const description = form.getAttribute('tooldescription') || '';
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

    const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );

    for (const field of fields) {
      const name = field.name || field.id;
      if (!name) continue;

      // Skip submit elements
      if (field instanceof HTMLInputElement && (field.type === 'submit' || field.type === 'button')) {
        continue;
      }

      const placeholder = 'placeholder' in field ? field.placeholder : '';
      const description = field.getAttribute('toolparamdescription') || placeholder || field.title || '';
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
        inputSchema: entry.schema,
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
    const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );

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

/**
 * Creates a standard MCP SDK Tool mapping from the WebMCP Registry
 */
export function getStandardMcpToolsBridge(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
  const manager = WebMCPManager.getInstance();
  return manager.listTools().map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }));
}
