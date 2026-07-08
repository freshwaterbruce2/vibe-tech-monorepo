/**
 * uiChangeHeuristic tests — the spec-11 Phase-2 "UI-affecting" heuristic:
 * changed-path collection from diff artifacts (dedupe + malformed content),
 * the frontend-file filter (spec test scenario: .tsx counts, .md doesn't,
 * tests/type decls never do), and route derivation for the changed surface.
 */
import { describe, expect, it } from 'vitest';
import { encodeDiffContent } from '../../../services/artifacts/artifactContent';
import type { Artifact } from '../../../services/artifacts/types';
import {
  collectChangedPaths,
  deriveRoutePath,
  filterUiPaths,
  isUiAffectingPath,
} from '../../../services/browser/uiChangeHeuristic';

function diffArtifact(id: string, paths: string[], content?: string): Artifact {
  return {
    id,
    taskId: 'task-1',
    kind: 'diff',
    title: `Diff ${id}`,
    content:
      content ??
      encodeDiffContent(
        paths.map(path => ({
          path,
          originalContent: 'a',
          newContent: 'b',
          changeType: 'modify' as const,
        }))
      ),
    createdAt: new Date(1000).toISOString(),
    updatedAt: new Date(1000).toISOString(),
    status: 'final',
  };
}

describe('collectChangedPaths', () => {
  it('dedupes paths across multiple diff artifacts', () => {
    const paths = collectChangedPaths([
      diffArtifact('d-1', ['src/App.tsx', 'src/theme.css']),
      diffArtifact('d-2', ['src/App.tsx', 'README.md']),
    ]);
    expect(paths.sort()).toEqual(['README.md', 'src/App.tsx', 'src/theme.css']);
  });

  it('skips artifacts with undecodable content', () => {
    expect(collectChangedPaths([diffArtifact('d-x', [], 'not json')])).toEqual([]);
  });
});

describe('isUiAffectingPath / filterUiPaths', () => {
  it.each([
    ['src/components/Button.tsx', true],
    ['components/Button.jsx', true],
    ['styles/theme.css', true],
    ['styles/app.scss', true],
    ['public/index.html', true],
    ['src/services/foo.ts', true], // src code counts (SPA workspaces)
    ['src\\utils\\helpers.js', true], // Windows separators
    ['README.md', false],
    ['docs/notes.md', false],
    ['lib/tool.ts', false], // code outside src/
    ['package.json', false],
  ])('%s → %s', (path, expected) => {
    expect(isUiAffectingPath(path)).toBe(expected);
  });

  it('never flags tests or type-declaration files', () => {
    expect(isUiAffectingPath('src/Button.test.tsx')).toBe(false);
    expect(isUiAffectingPath('src/Button.spec.ts')).toBe(false);
    expect(isUiAffectingPath('src/__tests__/Button.tsx')).toBe(false);
    expect(isUiAffectingPath('src/agent.types.ts')).toBe(false);
    expect(isUiAffectingPath('src/global.d.ts')).toBe(false);
  });

  it('filters a mixed change-set down to the UI subset (spec scenario)', () => {
    expect(filterUiPaths(['src/App.tsx', 'README.md'])).toEqual(['src/App.tsx']);
    expect(filterUiPaths(['README.md', 'CHANGELOG.md'])).toEqual([]);
  });
});

describe('deriveRoutePath', () => {
  it('maps a pages/ file to its kebab-cased route', () => {
    expect(deriveRoutePath(['src/pages/Dashboard.tsx'])).toBe('/dashboard');
    expect(deriveRoutePath(['src/routes/UserSettings.tsx'])).toBe('/user-settings');
  });

  it('keeps nested route directories', () => {
    expect(deriveRoutePath(['src/pages/admin/UserSettings.tsx'])).toBe('/admin/user-settings');
  });

  it('maps index-like names to the root route', () => {
    expect(deriveRoutePath(['src/pages/Index.tsx'])).toBe('/');
    expect(deriveRoutePath(['src/views/Home.tsx'])).toBe('/');
    expect(deriveRoutePath(['src/pages/App.tsx'])).toBe('/');
  });

  it('handles Windows separators', () => {
    expect(deriveRoutePath(['src\\pages\\Dashboard.tsx'])).toBe('/dashboard');
  });

  it('falls back to the root route without a routing directory', () => {
    expect(deriveRoutePath(['src/components/Button.tsx'])).toBe('/');
    expect(deriveRoutePath([])).toBe('/');
  });

  it('uses the first routable path when several exist', () => {
    expect(deriveRoutePath(['src/components/B.tsx', 'src/pages/Settings.tsx'])).toBe('/settings');
  });
});
