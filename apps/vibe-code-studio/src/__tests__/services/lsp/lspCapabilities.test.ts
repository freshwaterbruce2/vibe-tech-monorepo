import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SIGNATURE_TRIGGER_CHARACTERS,
  extractCapabilities,
  signatureHelpRetriggerCharacters,
  signatureHelpTriggerCharacters,
  supportsPrepareRename,
} from '../../../services/lsp/lspCapabilities';

describe('extractCapabilities', () => {
  it('returns the capabilities object from an initialize result', () => {
    const capabilities = { renameProvider: true };
    expect(extractCapabilities({ capabilities })).toBe(capabilities);
  });

  it('returns null for null, non-object, and capability-less results', () => {
    expect(extractCapabilities(null)).toBeNull();
    expect(extractCapabilities('nope')).toBeNull();
    expect(extractCapabilities({})).toBeNull();
  });
});

describe('supportsPrepareRename', () => {
  it('is true only for renameProvider.prepareProvider === true', () => {
    expect(supportsPrepareRename({ renameProvider: { prepareProvider: true } })).toBe(true);
  });

  it('is false for bare renameProvider, missing, malformed, and non-object caps', () => {
    expect(supportsPrepareRename({ renameProvider: true })).toBe(false);
    expect(supportsPrepareRename({ renameProvider: { prepareProvider: 'yes' } })).toBe(false);
    expect(supportsPrepareRename({})).toBe(false);
    expect(supportsPrepareRename(null)).toBe(false);
    expect(supportsPrepareRename(7)).toBe(false);
  });
});

describe('signatureHelpTriggerCharacters', () => {
  it('uses the server-advertised trigger characters', () => {
    const caps = { signatureHelpProvider: { triggerCharacters: ['(', ',', '<'] } };
    expect(signatureHelpTriggerCharacters(caps)).toEqual(['(', ',', '<']);
  });

  it('filters non-string entries', () => {
    const caps = { signatureHelpProvider: { triggerCharacters: ['(', 42, null] } };
    expect(signatureHelpTriggerCharacters(caps)).toEqual(['(']);
  });

  it('falls back to defaults for null caps, missing provider, and empty arrays', () => {
    expect(signatureHelpTriggerCharacters(null)).toEqual(DEFAULT_SIGNATURE_TRIGGER_CHARACTERS);
    expect(signatureHelpTriggerCharacters({})).toEqual(DEFAULT_SIGNATURE_TRIGGER_CHARACTERS);
    expect(signatureHelpTriggerCharacters({ signatureHelpProvider: true })).toEqual(
      DEFAULT_SIGNATURE_TRIGGER_CHARACTERS
    );
    expect(
      signatureHelpTriggerCharacters({ signatureHelpProvider: { triggerCharacters: [] } })
    ).toEqual(DEFAULT_SIGNATURE_TRIGGER_CHARACTERS);
  });

  it('falls back to defaults when the provider advertises no trigger arrays at all', () => {
    expect(signatureHelpTriggerCharacters({ signatureHelpProvider: {} })).toEqual(
      DEFAULT_SIGNATURE_TRIGGER_CHARACTERS
    );
    expect(signatureHelpRetriggerCharacters({ signatureHelpProvider: {} })).toEqual([')']);
  });
});

describe('signatureHelpRetriggerCharacters', () => {
  it('uses the server-advertised retrigger characters', () => {
    const caps = { signatureHelpProvider: { retriggerCharacters: [')', ','] } };
    expect(signatureHelpRetriggerCharacters(caps)).toEqual([')', ',']);
  });

  it('falls back to `)` for null caps, missing provider, and empty arrays', () => {
    expect(signatureHelpRetriggerCharacters(null)).toEqual([')']);
    expect(signatureHelpRetriggerCharacters({ signatureHelpProvider: 'x' })).toEqual([')']);
    expect(
      signatureHelpRetriggerCharacters({ signatureHelpProvider: { retriggerCharacters: [] } })
    ).toEqual([')']);
  });
});
