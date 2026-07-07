// Vitest setup file for React Testing Library
import '@testing-library/jest-dom';

// Mock matchMedia for tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // In-memory localStorage mock with REAL round-trip behavior so persistence
  // tests (tokenService, dataStore, schedules, sensory prefs) actually exercise
  // write -> read. A no-op mock silently neuters every such assertion.
  const createStorageMock = (): Storage => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) =>
        Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;
  };
  Object.defineProperty(window, 'localStorage', {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });

  // Isolate tests: clear storage after each so module-level caches and
  // persisted state never leak across cases in the same file. Defensive because
  // some tests (e.g. config.test.ts) delete or replace `window` entirely.
  afterEach(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      /* a test may have replaced or removed window/localStorage */
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch {
      /* a test may have replaced or removed window/sessionStorage */
    }
  });

  // Mock ResizeObserver
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
}

class AudioParamMock {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class AudioNodeMock {
  connect() {}
}

class OscillatorNodeMock extends AudioNodeMock {
  type: OscillatorType = 'sine';
  frequency = new AudioParamMock();

  start() {}
  stop() {}
}

class GainNodeMock extends AudioNodeMock {
  gain = new AudioParamMock();
}

class AudioContextMock {
  currentTime = 0;
  destination = {};
  state: AudioContextState = 'running';

  createOscillator() {
    return new OscillatorNodeMock() as unknown as OscillatorNode;
  }

  createGain() {
    return new GainNodeMock() as unknown as GainNode;
  }

  async resume() {
    this.state = 'running';
  }

  async close() {
    this.state = 'closed';
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: AudioContextMock,
  });
  Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    value: AudioContextMock,
  });
}
