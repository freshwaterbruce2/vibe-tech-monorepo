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

  // Mock localStorage
  const localStorageMock = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
