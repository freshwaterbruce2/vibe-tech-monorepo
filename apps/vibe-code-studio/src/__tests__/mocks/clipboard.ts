import { vi } from 'vitest';

export const setupClipboardMock = () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockImplementation(async () => Promise.resolve()),
      readText: vi.fn().mockImplementation(async () => Promise.resolve('')),
      write: vi.fn().mockImplementation(async () => Promise.resolve()),
      read: vi.fn().mockImplementation(async () => Promise.resolve([])),
    },
    configurable: true,
    writable: true,
  });
};
