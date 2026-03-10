/**
 * Native Module Health Tests
 * Ensure required native modules can be resolved in the desktop environment.
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest';

const loadModule = async (moduleName: string) => {
  const mod = await import(moduleName);
  return (mod as { default?: unknown }).default ?? mod;
};

describe('Native Modules', () => {
  it('loads better-sqlite3', async () => {
    const module = await loadModule('better-sqlite3');
    expect(module).toBeDefined();
  });

  it('loads node-pty', async () => {
    const module = await loadModule('node-pty');
    expect(module).toBeDefined();
  });

  it('loads sharp when installed', async () => {
    try {
      const module = await loadModule('sharp');
      expect(module).toBeDefined();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/Cannot find module|ERR_MODULE_NOT_FOUND/);
    }
  });
});
