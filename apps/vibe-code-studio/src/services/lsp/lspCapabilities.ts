/**
 * Server-capability helpers (spec 07 polish). The LSP `initialize` response
 * carries a `capabilities` object; the client stores it verbatim and these
 * pure helpers interrogate it. Unknown/absent capabilities always degrade to
 * the conservative default — never throw on malformed shapes.
 */

/** Default signature-help triggers when the server does not advertise any. */
export const DEFAULT_SIGNATURE_TRIGGER_CHARACTERS = ['(', ','];

/** Extract the `capabilities` object from an `initialize` result (null if absent). */
export function extractCapabilities(initializeResult: unknown): unknown {
  if (!initializeResult || typeof initializeResult !== 'object') return null;
  return (initializeResult as { capabilities?: unknown }).capabilities ?? null;
}

/**
 * True when the server advertises `renameProvider: { prepareProvider: true }`.
 * A bare `renameProvider: true` (or anything else) means rename is supported
 * but prepareRename is not.
 */
export function supportsPrepareRename(capabilities: unknown): boolean {
  if (!capabilities || typeof capabilities !== 'object') return false;
  const rename = (capabilities as { renameProvider?: unknown }).renameProvider;
  if (!rename || typeof rename !== 'object') return false;
  return (rename as { prepareProvider?: unknown }).prepareProvider === true;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * Signature-help trigger characters advertised by the server
 * (`signatureHelpProvider.triggerCharacters`), falling back to `(` and `,`.
 */
export function signatureHelpTriggerCharacters(capabilities: unknown): string[] {
  if (!capabilities || typeof capabilities !== 'object') {
    return DEFAULT_SIGNATURE_TRIGGER_CHARACTERS;
  }
  const provider = (capabilities as { signatureHelpProvider?: unknown }).signatureHelpProvider;
  if (!provider || typeof provider !== 'object') return DEFAULT_SIGNATURE_TRIGGER_CHARACTERS;
  const chars = stringArray((provider as { triggerCharacters?: unknown }).triggerCharacters);
  return chars.length > 0 ? chars : DEFAULT_SIGNATURE_TRIGGER_CHARACTERS;
}

/** Retrigger characters (`signatureHelpProvider.retriggerCharacters`), default `)`. */
export function signatureHelpRetriggerCharacters(capabilities: unknown): string[] {
  if (!capabilities || typeof capabilities !== 'object') return [')'];
  const provider = (capabilities as { signatureHelpProvider?: unknown }).signatureHelpProvider;
  if (!provider || typeof provider !== 'object') return [')'];
  const chars = stringArray((provider as { retriggerCharacters?: unknown }).retriggerCharacters);
  return chars.length > 0 ? chars : [')'];
}
