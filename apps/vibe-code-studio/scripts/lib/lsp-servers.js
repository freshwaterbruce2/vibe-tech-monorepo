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
 * Resolve the server spec for a language id, optionally rewriting the command to
 * an absolute path inside `binDir` when that binary exists there (checked via the
 * injected `exists` predicate, keeping this module pure/testable).
 * @param {string} languageId
 * @param {{ binDir?: string, exists?: (p: string) => boolean, sep?: string }} [opts]
 * @returns {ServerSpec | null}
 */
export function resolveServer(languageId, opts = {}) {
  const base = SERVERS[languageId];
  if (!base) return null;

  const { binDir, exists, sep = '\\' } = opts;
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
