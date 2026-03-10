import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Import mocks in specific order
import './setup/mockDom';
import './setup/mockElectron';
import './setup/mockMonaco';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Add jest global for tests that still use it
(global as any).jest = vi;
