/**
 * Unit tests for resolveWorkspaceRoot() — the self-healing workspace-root
 * resolver that keeps the packaged gateway sidecar plug-and-play even when a
 * stale machine env var (e.g. a retired C:\dev) is inherited by the process.
 *
 * fs.existsSync is mocked so we can drive the "WORKSPACE_ROOT points at a real
 * pnpm workspace" vs "WORKSPACE_ROOT is bogus" branches without touching disk.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolveWorkspaceRoot } from '../workspace-scanner.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn() };
});

const mockedExistsSync = vi.mocked(existsSync);
const ORIGINAL_WORKSPACE_ROOT = process.env.WORKSPACE_ROOT;
// Expected canonical fallback returned by resolveWorkspaceRoot().
const DEFAULT_ROOT = 'V:/monorepo'; // path-segregation-ignore (expected fallback value under test)

describe('resolveWorkspaceRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_WORKSPACE_ROOT === undefined) delete process.env.WORKSPACE_ROOT;
    else process.env.WORKSPACE_ROOT = ORIGINAL_WORKSPACE_ROOT;
  });

  it('falls back to the canonical root when WORKSPACE_ROOT lacks pnpm-workspace.yaml', () => {
    // Stale inherited value (the retired C:\dev) — no workspace manifest there.
    process.env.WORKSPACE_ROOT = 'C:/dev';
    mockedExistsSync.mockReturnValue(false);

    expect(resolveWorkspaceRoot()).toBe(DEFAULT_ROOT);
    expect(mockedExistsSync).toHaveBeenCalledWith(expect.stringContaining('pnpm-workspace.yaml'));
  });

  it('honors WORKSPACE_ROOT when it contains pnpm-workspace.yaml', () => {
    process.env.WORKSPACE_ROOT = 'D:/some-workspace';
    mockedExistsSync.mockReturnValue(true);

    expect(resolveWorkspaceRoot()).toBe('D:/some-workspace');
    expect(mockedExistsSync).toHaveBeenCalledOnce();
  });

  it('falls back to the canonical root when WORKSPACE_ROOT is unset (no disk check)', () => {
    delete process.env.WORKSPACE_ROOT;

    expect(resolveWorkspaceRoot()).toBe(DEFAULT_ROOT);
    expect(mockedExistsSync).not.toHaveBeenCalled();
  });
});
