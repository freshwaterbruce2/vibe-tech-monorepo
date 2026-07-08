/**
 * UI-change heuristic — spec 11 Phase 2/3. Pure functions that decide, from
 * the diff artifacts a task recorded, whether its change-set touched the
 * frontend (worth a browser verification pass) and which route to check.
 * Heuristic per spec: diff touches .tsx/.css-style assets, or src/** code.
 * Tests/type-decl files never count (they can't affect the rendered UI).
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { decodeDiffContent } from '../artifacts/artifactContent';
import type { Artifact } from '../artifacts/types';

/** Extensions that are UI-affecting wherever they live */
const UI_ASSET_RE = /\.(tsx|jsx|css|scss|less|html)$/i;
/** Code under src/ is treated as frontend-affecting (SPA workspaces) */
const SRC_CODE_RE = /(?:^|[\\/])src[\\/].*\.(ts|js|mjs|cjs)$/i;
/** Never UI-affecting: tests and type-only declaration modules */
const NON_UI_RE = /(\.(test|spec)\.|[\\/]__tests__[\\/]|\.types\.ts$|\.d\.ts$)/i;

/** Deduped changed-file paths across a task's decoded diff artifacts */
export function collectChangedPaths(diffs: Artifact[]): string[] {
  const paths = new Set<string>();
  for (const diff of diffs) {
    for (const change of decodeDiffContent(diff.content)?.changes ?? []) {
      paths.add(change.path);
    }
  }
  return [...paths];
}

/** True when the path plausibly affects the rendered frontend */
export function isUiAffectingPath(path: string): boolean {
  if (NON_UI_RE.test(path)) return false;
  return UI_ASSET_RE.test(path) || SRC_CODE_RE.test(path);
}

/** The subset of paths that make the change-set UI-affecting */
export function filterUiPaths(paths: string[]): string[] {
  return paths.filter(isUiAffectingPath);
}

const ROUTE_DIR_RE = /(?:^|[\\/])(?:pages|routes|views)[\\/](.+)\.\w+$/i;
const INDEX_NAMES = new Set(['index', 'app', 'main', 'home']);

function toKebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Best-effort route for the changed surface: the first changed file under a
 * pages/routes/views directory maps to its kebab-cased path; index-like
 * names (and everything else) fall back to the dev server root.
 */
export function deriveRoutePath(uiPaths: string[]): string {
  for (const path of uiPaths) {
    const match = ROUTE_DIR_RE.exec(path);
    if (!match?.[1]) continue;
    const segment = match[1].replace(/\\/g, '/');
    const leaf = segment.split('/').at(-1) ?? '';
    if (INDEX_NAMES.has(leaf.toLowerCase())) return '/';
    return `/${toKebab(segment)}`;
  }
  return '/';
}
