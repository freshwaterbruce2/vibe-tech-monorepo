/**
 * ExtensionManager
 *
 * Plugin architecture for DeepCode Editor inspired by VS Code
 * Manages extension lifecycle, commands, and API
 *
 * Based on 2025 best practices:
 * - Interface-based extension contracts
 * - Dependency resolution with circular detection
 * - Extension context with subscriptions
 * - Command registration and execution
 * - Extension API exposure
 */

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  main: string;
  displayName?: string;
  description?: string;
  categories?: string[];
  keywords?: string[];
  icon?: string;
  repository?: string;
  license?: string;
  activationEvents?: string[];
  extensionDependencies?: string[];
}

export interface ExtensionContext {
  extensionId: string;
  subscriptions: { dispose: () => void }[];
  registerCommand: (commandId: string, handler: CommandHandler) => void;
  api: ExtensionAPI;
}

interface WorkspaceApi {
  workspaceFolders: string[];
  getConfiguration: (section?: string) => Record<string, unknown>;
  openFolder: (path: string) => Promise<void>;
  getFolders: () => string[];
}

interface WindowApi {
  showInformationMessage: (message: string) => void;
  showErrorMessage: (message: string) => void;
}

interface CommandsApi {
  registerCommand: (commandId: string, handler: CommandHandler) => void;
  executeCommand: (commandId: string, ...args: unknown[]) => Promise<unknown>;
}

export interface ExtensionAPI {
  workspace: WorkspaceApi;
  window: WindowApi;
  commands: CommandsApi;
}

export interface Extension {
  id: string;
  manifest: ExtensionManifest;
  isActive: boolean;
}

type ActivateFunction = (
  context: ExtensionContext,
) => void | Promise<void | { deactivate?: () => void | Promise<void> }>;
type DeactivateFunction = () => void | Promise<void>;
type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

const hasDeactivate = (value: unknown): value is { deactivate: DeactivateFunction } => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (!('deactivate' in value)) {
    return false;
  }

  return typeof (value as { deactivate?: unknown }).deactivate === 'function';
};

interface ExtensionInternal extends Extension {
  activateFn?: ActivateFunction;
  deactivateFn?: DeactivateFunction;
  context?: ExtensionContext;
}

export class ExtensionManager {
  private extensions = new Map<string, ExtensionInternal>();
  private commands = new Map<string, CommandHandler>();

  /**
   * Register a new extension
   */
  registerExtension(manifest: ExtensionManifest, activateFn?: ActivateFunction): Extension {
    // Validate manifest
    if (!manifest.id || manifest.id.trim() === '') {
      throw new Error('Invalid extension manifest');
    }

    if (!manifest.name || manifest.name.trim() === '') {
      throw new Error('Invalid extension manifest');
    }

    if (!manifest.version) {
      throw new Error('Invalid extension manifest');
    }

    if (!manifest.publisher) {
      throw new Error('Invalid extension manifest');
    }

    if (!manifest.main) {
      throw new Error('Invalid extension manifest');
    }

    // Check for duplicates
    if (this.extensions.has(manifest.id)) {
      throw new Error('Extension already registered');
    }

    const extension: ExtensionInternal = {
      id: manifest.id,
      manifest,
      isActive: false,
      activateFn,
    };

    this.extensions.set(manifest.id, extension);

    return {
      id: extension.id,
      manifest: extension.manifest,
      isActive: extension.isActive,
    };
  }

  /**
   * Activate an extension
   */
  async activateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);

    if (!extension) {
      throw new Error('Extension not found');
    }

    if (extension.isActive) {
      return; // Already active, no-op
    }

    // Check and activate dependencies first
    if (extension.manifest.extensionDependencies) {
      await this.activateDependencies(extensionId, extension.manifest.extensionDependencies, []);
    }

    // Create extension context
    const context: ExtensionContext = {
      extensionId: extension.id,
      subscriptions: [],
      registerCommand: (commandId: string, handler: CommandHandler) => {
        this.commands.set(commandId, handler);
        context.subscriptions.push({
          dispose: () => this.commands.delete(commandId),
        });
      },
      api: {
        workspace: {
          workspaceFolders: [],
          getConfiguration: (_section?: string) => ({}),
          openFolder: async (_path: string) => Promise.resolve(),
          getFolders: () => [],
        },
        window: {
          showInformationMessage: (message: string) => console.log(message),
          showErrorMessage: (message: string) => console.error(message),
        },
        commands: {
          registerCommand: (commandId: string, handler: CommandHandler) => {
            context.registerCommand(commandId, handler);
          },
          executeCommand: async (commandId: string, ...args: unknown[]) => {
            return this.executeCommand(commandId, ...args);
          },
        },
      },
    };

    extension.context = context;

    // Call activate function and capture deactivate function
    if (extension.activateFn) {
      const result = extension.activateFn(context);
      if (result && typeof result.then === 'function') {
        const awaitedResult = await result;
        if (hasDeactivate(awaitedResult)) {
          extension.deactivateFn = awaitedResult.deactivate;
        }
      } else if (hasDeactivate(result)) {
        extension.deactivateFn = result.deactivate;
      }
    }

    extension.isActive = true;
  }

  /**
   * Activate extension dependencies
   */
  private async activateDependencies(
    extensionId: string,
    dependencies: string[],
    visited: string[],
  ): Promise<void> {
    // Check for circular dependencies
    if (visited.includes(extensionId)) {
      throw new Error('Circular dependency detected');
    }

    const newVisited = [...visited, extensionId];

    for (const depId of dependencies) {
      const depExtension = this.extensions.get(depId);

      if (!depExtension) {
        throw new Error('Dependency not found');
      }

      // Recursively activate dependencies
      if (depExtension.manifest.extensionDependencies) {
        await this.activateDependencies(
          depId,
          depExtension.manifest.extensionDependencies,
          newVisited,
        );
      }

      // Activate dependency if not already active
      if (!depExtension.isActive) {
        await this.activateExtension(depId);
      }
    }
  }

  /**
   * Deactivate an extension
   */
  async deactivateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);

    if (!extension) {
      throw new Error('Extension not found');
    }

    if (!extension.isActive) {
      return; // Already inactive, no-op
    }

    // Call deactivate function if exists
    if (extension.deactivateFn) {
      const result = extension.deactivateFn();
      if (result && typeof result.then === 'function') {
        await result;
      }
    }

    // Dispose all subscriptions
    if (extension.context) {
      for (const subscription of extension.context.subscriptions) {
        subscription.dispose();
      }
      extension.context.subscriptions = [];
    }

    extension.isActive = false;
  }

  /**
   * Uninstall an extension
   */
  uninstallExtension(extensionId: string): void {
    const extension = this.extensions.get(extensionId);

    if (!extension) {
      throw new Error('Extension not found');
    }

    // Deactivate first if active (synchronous version)
    if (extension.isActive) {
      // Call deactivate function if exists
      if (extension.deactivateFn) {
        void Promise.resolve(extension.deactivateFn()).catch((error: unknown) => {
          console.error('Failed to deactivate extension during uninstall:', error);
        });
      }

      // Dispose all subscriptions
      if (extension.context) {
        for (const subscription of extension.context.subscriptions) {
          subscription.dispose();
        }
        extension.context.subscriptions = [];
      }

      extension.isActive = false;
    }

    this.extensions.delete(extensionId);
  }

  /**
   * Get extension by ID
   */
  getExtension(extensionId: string): Extension {
    const extension = this.extensions.get(extensionId);

    if (!extension) {
      throw new Error('Extension not found');
    }

    return {
      id: extension.id,
      manifest: extension.manifest,
      isActive: extension.isActive,
    };
  }

  /**
   * Get all extensions
   */
  getAllExtensions(): Extension[] {
    return Array.from(this.extensions.values()).map((ext) => ({
      id: ext.id,
      manifest: ext.manifest,
      isActive: ext.isActive,
    }));
  }

  /**
   * Get active extensions
   */
  getActiveExtensions(): Extension[] {
    return this.getAllExtensions().filter((ext) => ext.isActive);
  }

  /**
   * Get all registered commands
   */
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Execute a command
   */
  async executeCommand(commandId: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.commands.get(commandId);

    if (!handler) {
      throw new Error('Command not found');
    }

    const result = handler(...args);
    return await Promise.resolve(result);
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Deactivate all active extensions
    for (const extension of this.extensions.values()) {
      if (extension.isActive) {
        // Call deactivate function if exists
        if (extension.deactivateFn) {
          void Promise.resolve(extension.deactivateFn()).catch((error: unknown) => {
            console.error('Failed to deactivate extension during dispose:', error);
          });
        }

        // Dispose all subscriptions
        if (extension.context) {
          for (const subscription of extension.context.subscriptions) {
            subscription.dispose();
          }
          extension.context.subscriptions = [];
        }

        extension.isActive = false;
      }
    }

    // Clear all data
    this.extensions.clear();
    this.commands.clear();
  }

  /**
   * Set deactivate function for extension (for testing)
   */
  setDeactivateFunction(extensionId: string, deactivateFn: DeactivateFunction): void {
    const extension = this.extensions.get(extensionId);
    if (extension) {
      extension.deactivateFn = deactivateFn;
    }
  }
}
