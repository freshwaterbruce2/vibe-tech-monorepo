/**
 * Browser-compatible EventEmitter
 * Simple implementation to replace Node.js 'events' module
 */

/** Internal listener storage type. */
type Listener = (...args: unknown[]) => void;

export class EventEmitter {
  private events: Map<string, Listener[]> = new Map();

  /**
   * Register a typed listener. Generic overload allows passing callbacks with
   * specific parameter types (e.g., `(task: BackgroundTask) => void`) without
   * requiring the caller to manually cast to the internal Listener type.
   */
  on<T extends unknown[]>(event: string, listener: (...args: T) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener as unknown as Listener);
    return this;
  }

  once<T extends unknown[]>(event: string, listener: (...args: T) => void): this {
    const onceWrapper = (...args: unknown[]) => {
      this.off(event, onceWrapper as unknown as (...args: T) => void);
      (listener as Listener)(...args);
    };
    return this.on(event, onceWrapper);
  }

  off<T extends unknown[]>(event: string, listener: (...args: T) => void): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener as unknown as Listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.events.get(event);
    if (listeners && listeners.length > 0) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length ?? 0;
  }
}
