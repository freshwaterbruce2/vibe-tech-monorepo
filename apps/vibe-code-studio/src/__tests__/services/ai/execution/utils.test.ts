import { describe, expect, it } from 'vitest';
import { assertWorkspacePath } from '../../../../services/ai/execution/utils';

describe('assertWorkspacePath', () => {
  it('accepts a path within the workspace case-insensitively', () => {
    expect(() => assertWorkspacePath('v:/Repo/src/a.ts', 'V:\\repo')).not.toThrow();
  });

  it.each([
    ['prefix collision', 'V:\\repository\\a.ts'],
    ['foreign drive', 'D:\\repo\\a.ts'],
    ['UNC path', '\\\\server\\share\\a.ts'],
    ['traversal', 'V:\\repo\\..\\secret.ts'],
  ])('rejects %s', (_label, candidate) => {
    expect(() => assertWorkspacePath(candidate, 'V:\\repo')).toThrow(
      /outside the active workspace/
    );
  });
});
