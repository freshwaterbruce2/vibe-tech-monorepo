/**
 * Language-server registry (pure, no I/O).
 *
 * Maps a Monaco/LSP `languageId` to the stdio server command + args. Phase 1
 * targets dev/system-installed servers resolved from PATH (or a caller-supplied
 * bin directory). Unknown languages resolve to `null` so the relay closes the
 * socket and the client falls back to Monaco's built-in behavior (spec AC10) —
 * deliberately NOT defaulting to the TS server the way the orphan proxy did.
 */

/** @typedef {{ command: string, args: string[] }} ServerSpec */
/**
 * @typedef {object} ResolveOpts
 * @property {string[]} [paths] PATH-style directories to scan
 * @property {string[]} [exts] extension probe order (e.g. ['.cmd', '.exe', ''])
 * @property {(p: string) => boolean} [exists] injected fs predicate
 * @property {string} [sep] path separator
 */

/** @type {Record<string, ServerSpec>} */
const SERVERS = {
  typescript: { command: 'typescript-language-server', args: ['--stdio'] },
  javascript: { command: 'typescript-language-server', args: ['--stdio'] },
  typescriptreact: { command: 'typescript-language-server', args: ['--stdio'] },
  javascriptreact: { command: 'typescript-language-server', args: ['--stdio'] },
  python: { command: 'pyright-langserver', args: ['--stdio'] },
  rust: { command: 'rust-analyzer', args: [] },
};

/**
 * Scan PATH-style directories for an executable, probing Windows shim
 * extensions. Pure: the `exists` predicate is injected.
 * @param {string} command bare command name (no extension)
 * @param {ResolveOpts} [opts]
 * @returns {string | null} absolute path or null when not found
 */
export function findExecutable(command, opts = {}) {
  const { paths = [], exts = [''], exists, sep = '\\' } = opts;
  if (!exists) return null;
  for (const dir of paths) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = `${dir}${sep}${command}${ext}`;
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Node's spawn() cannot execute `.cmd`/`.bat` shims without a shell
 * (CVE-2024-27980 behavior on Node >= 20). Decide per resolved spec: batch
 * shims get `shell: true` with a quoted command; real binaries spawn directly.
 * @param {ServerSpec} spec
 * @returns {{ command: string, args: string[], options: object }}
 */
export function buildSpawnCommand(spec) {
  const lower = spec.command.toLowerCase();
  const needsShell = lower.endsWith('.cmd') || lower.endsWith('.bat');
  return {
    command: needsShell ? `"${spec.command}"` : spec.command,
    args: spec.args,
    options: needsShell ? { windowsHide: true, shell: true } : { windowsHide: true },
  };
}

/**
 * Resolve the server spec for a language id. When `opts.paths` is supplied the
 * command is rewritten to the first matching executable on those paths (this is
 * how Windows `.cmd` shims become spawnable); the legacy `binDir` single-dir
 * probe is kept for back-compat. All I/O goes through the injected `exists`
 * predicate, keeping this module pure/testable.
 * @param {string} languageId
 * @param {ResolveOpts & { binDir?: string }} [opts]
 * @returns {ServerSpec | null}
 */
export function resolveServer(languageId, opts = {}) {
  const base = SERVERS[languageId];
  if (!base) return null;

  const { binDir, paths, exts, exists, sep = '\\' } = opts;
  if (paths && exists) {
    const found = findExecutable(base.command, { paths, exts, exists, sep });
    if (found) {
      return { command: found, args: base.args };
    }
  }
  if (binDir && exists) {
    for (const ext of ['.cmd', '.exe', '']) {
      const candidate = `${binDir}${sep}${base.command}${ext}`;
      if (exists(candidate)) {
        return { command: candidate, args: base.args };
      }
    }
  }
  return { command: base.command, args: base.args };
}

/** True when a language id has a registered server. */
export function isSupportedLanguage(languageId) {
  return Object.prototype.hasOwnProperty.call(SERVERS, languageId);
}
