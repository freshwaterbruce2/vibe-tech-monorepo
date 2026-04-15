/**
 * Self-Critique Engine — Phase 2
 *
 * Static analysis rubric that evaluates a modified TypeScript/TSX file
 * against the monorepo's coding standards (from CLAUDE.md rules).
 *
 * Each check returns 0 (violation) or 1 (pass). Aggregate is the static_score.
 * Violations are collected and stored as preference training signal.
 *
 * Rubric (7 checks, equal weight):
 *   1. no_mock        — no TODO/placeholder/hardcoded stubs
 *   2. no_any         — no explicit `any` type
 *   3. no_console     — no console.log/warn/error left in
 *   4. type_imports   — uses `import type` for type-only imports
 *   5. no_nonnull     — no non-null assertions (!)
 *   6. no_react_default — no `import React from 'react'`
 *   7. no_react_fc    — no `React.FC<Props>` pattern
 */

import { readFileSync, existsSync } from 'fs';

export interface RubricResult {
  searchFirst: number;      // 0/1 — was this a new file or modification?
  noMock: number;           // 0/1
  noAny: number;            // 0/1
  noConsole: number;        // 0/1
  typeImports: number;      // 0/1
  noNonnull: number;        // 0/1
  noReactDefault: number;   // 0/1
  noReactFc: number;        // 0/1
}

export interface CritiqueResult {
  filePath: string;
  rubric: RubricResult;
  staticScore: number;         // 0.0 – 1.0
  violations: string[];        // human-readable violation list
  preferenceType: 'positive' | 'negative' | 'mixed';
  summary: string;
}

/** Anti-patterns from CLAUDE.md rules that must not appear in production code */
const MOCK_PATTERNS = [
  /\/\/\s*TODO:/i,
  /\/\/\s*FIXME:/i,
  /\/\/\s*HACK:/i,
  /\/\/\s*placeholder/i,
  /\/\/\s*temporary/i,
  /\/\/\s*Not implemented/i,
  /throw new Error\(['"]Not implemented/i,
  /return null;\s*\/\/ placeholder/i,
  /await sleep\(\d+\)/,
  /console\.log\(.*TODO/i,
];

const CONSOLE_PATTERNS = [
  /console\.(log|warn|error|debug|info)\s*\(/,
];

/** `import React from 'react'` — banned in React 17+ JSX transform */
const REACT_DEFAULT_IMPORT = /import\s+React\s+from\s+['"]react['"]/;

/** `React.FC<Props>` — banned, use typed props directly */
const REACT_FC_PATTERN = /:\s*React\.FC\s*</;

/** Explicit `any` type usage */
const ANY_TYPE_PATTERNS = [
  /:\s*any\b/,
  /as\s+any\b/,
  /<any>/,
  /Array<any>/,
  /Promise<any>/,
];

/** Non-null assertions `!` at end of expression */
const NONNULL_PATTERN = /[a-zA-Z0-9_\])"'`]\s*!/;

/** Type-only import check: looks for React types used as values */
const TYPE_IMPORT_VIOLATIONS = [
  // importing ReactNode/MouseEvent etc as value imports
  /import\s+\{[^}]*\b(ReactNode|ReactElement|MouseEvent|KeyboardEvent|ChangeEvent|FormEvent|CSSProperties|HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes)\b[^}]*\}\s+from\s+['"]react['"]/,
];

export function critiqueFile(filePath: string, isNewFile = false): CritiqueResult {
  const violations: string[] = [];

  if (!existsSync(filePath)) {
    return {
      filePath,
      rubric: { searchFirst: 0, noMock: 0, noAny: 0, noConsole: 0, typeImports: 0, noNonnull: 0, noReactDefault: 0, noReactFc: 0 },
      staticScore: 0,
      violations: [`File not found: ${filePath}`],
      preferenceType: 'negative',
      summary: 'File not found — cannot critique.',
    };
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const isTypeScript = /\.(ts|tsx)$/.test(filePath);

  // 1. search_first — penalise new file creation without evidence of search
  //    (heuristic: new files under 20 lines are usually helpers, skip check)
  const searchFirst = isNewFile && lines.length > 20 ? 0 : 1;
  if (searchFirst === 0) {
    violations.push('New file created (>20 lines) — verify no existing implementation covers this.');
  }

  // 2. no_mock
  let noMock = 1;
  for (const line of lines) {
    for (const pattern of MOCK_PATTERNS) {
      if (pattern.test(line)) {
        violations.push(`Placeholder/mock code: "${line.trim().substring(0, 80)}"`);
        noMock = 0;
        break;
      }
    }
    if (noMock === 0) break;
  }

  // 3. no_any — only for TypeScript files
  let noAny = 1;
  if (isTypeScript) {
    for (const line of lines) {
      // Skip comments and test files
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      for (const pattern of ANY_TYPE_PATTERNS) {
        if (pattern.test(line)) {
          violations.push(`Explicit 'any' type: "${line.trim().substring(0, 80)}"`);
          noAny = 0;
          break;
        }
      }
      if (noAny === 0) break;
    }
  }

  // 4. no_console
  let noConsole = 1;
  for (const line of lines) {
    if (line.trim().startsWith('//')) continue;
    for (const pattern of CONSOLE_PATTERNS) {
      if (pattern.test(line)) {
        violations.push(`Debug console call left in: "${line.trim().substring(0, 80)}"`);
        noConsole = 0;
        break;
      }
    }
    if (noConsole === 0) break;
  }

  // 5. type_imports — React type-only values imported without `import type`
  let typeImports = 1;
  if (isTypeScript) {
    for (const line of lines) {
      for (const pattern of TYPE_IMPORT_VIOLATIONS) {
        if (pattern.test(line)) {
          violations.push(`Should use 'import type' for type-only imports: "${line.trim().substring(0, 80)}"`);
          typeImports = 0;
          break;
        }
      }
      if (typeImports === 0) break;
    }
  }

  // 6. no_nonnull — non-null assertions banned in strict mode
  let noNonnull = 1;
  if (isTypeScript) {
    for (const line of lines) {
      if (line.trim().startsWith('//')) continue;
      if (NONNULL_PATTERN.test(line)) {
        violations.push(`Non-null assertion (!): "${line.trim().substring(0, 80)}"`);
        noNonnull = 0;
        break;
      }
    }
  }

  // 7. no_react_default — `import React from 'react'` banned
  let noReactDefault = 1;
  if (isTypeScript && REACT_DEFAULT_IMPORT.test(content)) {
    violations.push("Banned: `import React from 'react'` — React 17+ JSX transform doesn't need it.");
    noReactDefault = 0;
  }

  // 8. no_react_fc — `React.FC<Props>` banned
  let noReactFc = 1;
  if (isTypeScript && REACT_FC_PATTERN.test(content)) {
    violations.push("Banned: `React.FC<Props>` — use typed props directly instead.");
    noReactFc = 0;
  }

  const rubric: RubricResult = {
    searchFirst, noMock, noAny, noConsole, typeImports,
    noNonnull, noReactDefault, noReactFc,
  };

  const checksRun = Object.keys(rubric).length;
  const passed = Object.values(rubric).reduce((sum, v) => sum + v, 0);
  const staticScore = passed / checksRun;

  const preferenceType: 'positive' | 'negative' | 'mixed' =
    staticScore === 1.0 ? 'positive' :
    staticScore < 0.6  ? 'negative' : 'mixed';

  const summary =
    staticScore === 1.0
      ? `All ${checksRun} checks passed. Score: 1.000`
      : `${checksRun - passed}/${checksRun} checks failed. Score: ${staticScore.toFixed(3)}. Violations: ${violations.slice(0, 2).join('; ')}`;

  return { filePath, rubric, staticScore, violations, preferenceType, summary };
}

/**
 * Generate a preference pair from two critiques of the same task type.
 * chosen = higher scoring; rejected = lower scoring.
 */
export function generatePreferencePair(
  taskType: string,
  winCritique: CritiqueResult,
  lossCritique: CritiqueResult,
): { chosen: string; rejected: string; critique: string; confidence: number } {
  const scoreDelta = winCritique.staticScore - lossCritique.staticScore;
  const confidence = Math.min(0.95, 0.5 + scoreDelta);

  const winViolations = winCritique.violations.length === 0
    ? 'No violations — all rubric checks passed.'
    : `Violations: ${winCritique.violations.join('; ')}`;

  const lossViolations = lossCritique.violations.length === 0
    ? 'No violations.'
    : `Violations: ${lossCritique.violations.join('; ')}`;

  const critique =
    `Task: ${taskType}\n` +
    `CHOSEN (score ${winCritique.staticScore.toFixed(3)}): ${winCritique.filePath}\n${winViolations}\n` +
    `REJECTED (score ${lossCritique.staticScore.toFixed(3)}): ${lossCritique.filePath}\n${lossViolations}\n` +
    `Delta: +${scoreDelta.toFixed(3)} — prefer the approach that avoids ${lossCritique.violations.slice(0, 2).join(', ')}.`;

  return {
    chosen: `${winCritique.filePath} (score=${winCritique.staticScore.toFixed(3)})`,
    rejected: `${lossCritique.filePath} (score=${lossCritique.staticScore.toFixed(3)})`,
    critique,
    confidence,
  };
}
