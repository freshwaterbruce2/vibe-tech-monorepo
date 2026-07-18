import { describe, expect, it } from 'vitest';

import { remapPath } from '../sidebarPathUtils';

describe('remapPath', () => {
  it('replaces an exact path match', () => {
    expect(remapPath('/a/b', '/a/b', '/a/c')).toBe('/a/c');
  });

  it('rewrites nested children under the renamed path', () => {
    expect(remapPath('/a/b/file.ts', '/a/b', '/a/c')).toBe('/a/c/file.ts');
  });

  it('leaves unrelated paths unchanged', () => {
    expect(remapPath('/x/y', '/a/b', '/a/c')).toBe('/x/y');
  });
});
