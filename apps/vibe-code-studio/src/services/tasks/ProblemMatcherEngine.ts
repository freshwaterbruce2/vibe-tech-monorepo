/**
 * ProblemMatcherEngine — converts task terminal output lines into structured
 * Diagnostics using VS Code-style problem matchers (built-in or inline regex).
 * Multi-line matchers (eslint-stylish) are supported via a per-run session
 * state machine. Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import type {
  Diagnostic,
  DiagnosticSeverity,
  ProblemMatcherRef,
  ProblemPatternConfig,
} from './types';

/**
 * Canonical $tsc pattern (mirrors VS Code / actions/setup-node tsc.json):
 * matches both `file(1,2): error TS123: msg` and `file:1:2 - error TS123: msg`.
 */
const TSC_PATTERN: ProblemPatternConfig = {
  regexp:
    '^([^\\s].*?)[\\(:](\\d+)[,:](\\d+)(?:\\):\\s+|\\s+-\\s+)' +
    '(error|warning|info)\\s+(TS\\d+)\\s*:\\s*(.*)$',
  file: 1,
  line: 2,
  column: 3,
  severity: 4,
  code: 5,
  message: 6,
};

/**
 * $eslint-stylish (mirrors VS Code built-in): a file-header line followed by
 * looped `  line:col  severity  message  rule` rows.
 */
const ESLINT_STYLISH_PATTERNS: ProblemPatternConfig[] = [
  { regexp: '^([^\\s].*)$', file: 1 },
  {
    regexp: '^\\s+(\\d+):(\\d+)\\s+(error|warning|info)\\s+(.+?)\\s\\s+(.*)$',
    line: 1,
    column: 2,
    severity: 3,
    message: 4,
    code: 5,
    loop: true,
  },
];

const BUILTIN_MATCHERS: Record<string, ProblemPatternConfig[]> = {
  $tsc: [TSC_PATTERN],
  '$eslint-stylish': ESLINT_STYLISH_PATTERNS,
};

export class ProblemMatcherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProblemMatcherError';
  }
}

interface CompiledPattern extends Omit<ProblemPatternConfig, 'regexp'> {
  regexp: RegExp;
}

/** ESC-prefixed CSI sequences only (must not eat plain "[..." text) */
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');

/** Removes ANSI color/control sequences PTY output carries */
export function stripAnsi(line: string): string {
  return line.replace(ANSI_RE, '');
}

const DRIVE_RE = /^[A-Za-z]:[\\/]/;

/**
 * Normalizes a tool-reported file path: unifies separators to backslash
 * (Windows-first workspace) and resolves relative paths against cwd.
 */
export function normalizeFilePath(file: string, cwd?: string): string {
  let path = file.trim().replace(/\//g, '\\');
  const isAbsolute = DRIVE_RE.test(path) || path.startsWith('\\\\');
  if (!isAbsolute && cwd) {
    const base = cwd.trim().replace(/\//g, '\\').replace(/\\+$/, '');
    path = `${base}\\${path}`;
  }
  return path;
}

function toSeverity(value: string | undefined): DiagnosticSeverity {
  if (value === 'warning' || value === 'info') return value;
  return 'error';
}

function resolvePatterns(ref: ProblemMatcherRef): ProblemPatternConfig[] {
  if (typeof ref === 'string') {
    const builtin = BUILTIN_MATCHERS[ref];
    if (!builtin) throw new ProblemMatcherError(`Unknown built-in problem matcher: "${ref}"`);
    return builtin;
  }
  return Array.isArray(ref.pattern) ? ref.pattern : [ref.pattern];
}

function compilePatterns(configs: ProblemPatternConfig[]): CompiledPattern[] {
  return configs.map(config => {
    try {
      return { ...config, regexp: new RegExp(config.regexp) };
    } catch (err) {
      throw new ProblemMatcherError(`Invalid problem matcher regexp: ${(err as Error).message}`);
    }
  });
}

function captureInto(
  target: Partial<Diagnostic>,
  pattern: CompiledPattern,
  match: RegExpExecArray,
  cwd?: string
): void {
  if (pattern.file !== undefined) {
    target.file = normalizeFilePath(match[pattern.file] ?? '', cwd);
  }
  if (pattern.line !== undefined) target.line = Number(match[pattern.line]);
  if (pattern.column !== undefined) target.column = Number(match[pattern.column]);
  if (pattern.severity !== undefined) target.severity = toSeverity(match[pattern.severity]);
  if (pattern.message !== undefined) target.message = (match[pattern.message] ?? '').trim();
  if (pattern.code !== undefined) target.code = (match[pattern.code] ?? '').trim();
}

/**
 * Per-run matcher session. Feed output lines via push(); emitted Diagnostics
 * are returned as they complete. Multi-line matchers accumulate state (the
 * file header) across lines; single-pattern matchers emit per matching line.
 */
export class ProblemMatcherSession {
  private readonly patterns: CompiledPattern[];
  private stateIndex = 0;
  private partial: Partial<Diagnostic> = {};

  constructor(
    ref: ProblemMatcherRef,
    private readonly source: string,
    private readonly cwd?: string
  ) {
    this.patterns = compilePatterns(resolvePatterns(ref));
  }

  push(rawLine: string): Diagnostic[] {
    const line = stripAnsi(rawLine).replace(/\r$/, '');
    return this.matchLine(line, true);
  }

  private matchLine(line: string, allowRetry: boolean): Diagnostic[] {
    // stateIndex is bounded by construction (reset() and the isLast guard below)
    const pattern = this.patterns[this.stateIndex] as CompiledPattern;
    const match = pattern.regexp.exec(line);
    if (!match) {
      if (this.stateIndex === 0) return [];
      // Mid-sequence (or looping) miss: reset and retry as a fresh first line.
      this.reset();
      return allowRetry ? this.matchLine(line, false) : [];
    }
    captureInto(this.partial, pattern, match, this.cwd);
    const isLast = this.stateIndex === this.patterns.length - 1;
    if (!isLast) {
      this.stateIndex++;
      return [];
    }
    const diagnostic = this.emit();
    if (pattern.loop) return diagnostic ? [diagnostic] : [];
    this.reset();
    return diagnostic ? [diagnostic] : [];
  }

  private emit(): Diagnostic | null {
    const { file, line, column, message } = this.partial;
    if (!file || line === undefined || Number.isNaN(line)) return null;
    return {
      file,
      line,
      column: column !== undefined && !Number.isNaN(column) ? column : 1,
      severity: this.partial.severity ?? 'error',
      message: message ?? '',
      ...(this.partial.code ? { code: this.partial.code } : {}),
      source: this.source,
    };
  }

  private reset(): void {
    this.stateIndex = 0;
    this.partial = {};
  }
}
