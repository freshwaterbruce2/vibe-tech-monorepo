/**
 * Shared fixtures for the review-bot test suites (spec 15).
 * FIXTURE_DIFF: two files.
 * src/a.ts — anchorable RIGHT lines {8..13}; adds at 9,10,11,12.
 *   line 10: console.log → heuristic warning/'style' (suppressed by default
 *   config); line 12: .toString() → heuristic error/'bug' (survives default
 *   filtering — the dedup/orchestrator tests depend on it).
 * src/b.ts — anchorable RIGHT lines {3,4,5}; add at 4.
 */
export const FIXTURE_DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 111..222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -8,4 +8,8 @@ function existing() {',
  '   const keep = 1;',
  '-  const removed = 2;',
  '+  const added = 2;',
  "+  console.log('debug');",
  '+  const third = 3;',
  '+  const label = value.toString();',
  '   return keep;',
  'diff --git a/src/b.ts b/src/b.ts',
  'index 333..444 100644',
  '--- a/src/b.ts',
  '+++ b/src/b.ts',
  '@@ -3,2 +3,3 @@ export const x = 1;',
  ' export const y = 2;',
  '+export const z = 3;',
  ' export const w = 4;',
  '',
].join('\n');

export const EMPTY_DIFF = '';
