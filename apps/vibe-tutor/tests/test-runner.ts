
// Mock browser globals
global.localStorage = {
  store: {} as Record<string, string>,
  getItem: function(key: string) { return this.store[key] ?? null; },
  setItem: function(key: string, value: string) { this.store[key] = value.toString(); },
  removeItem: function(key: string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.store[key];
  },
  clear: function() { this.store = {}; },
  key: function(index: number) { return Object.keys(this.store)[index] ?? null; },
  length: 0
};

global.window = {} as any;
global.document = {
  createElement: () => ({ appendChild: () => {} }),
  body: { appendChild: () => {} }
} as any;
global.customElements = {
  whenDefined: async () => {}
} as any;

// Run the test
import './test-integration';
