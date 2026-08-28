import { describe, expect, it } from 'vitest';

import { signatureHelpToMonaco } from '../../../services/lsp/lspSignatureHelp';

describe('signatureHelpToMonaco', () => {
  it('maps signatures, parameters, and active indices', () => {
    const result = signatureHelpToMonaco({
      signatures: [
        {
          label: 'add(a: number, b: number): number',
          documentation: 'Adds two numbers.',
          parameters: [
            { label: 'a: number', documentation: { value: 'first' } },
            { label: [15, 24] },
          ],
          activeParameter: 1,
        },
      ],
      activeSignature: 0,
      activeParameter: 1,
    });
    expect(result).toEqual({
      signatures: [
        {
          label: 'add(a: number, b: number): number',
          documentation: 'Adds two numbers.',
          parameters: [{ label: 'a: number', documentation: 'first' }, { label: [15, 24] }],
          activeParameter: 1,
        },
      ],
      activeSignature: 0,
      activeParameter: 1,
    });
  });

  it('skips malformed parameters and signatures', () => {
    const result = signatureHelpToMonaco({
      signatures: [
        { label: 'ok()', parameters: [null, { label: 7 }, { label: 'x' }, [1]] },
        { notALabel: true },
        'nope',
      ],
    });
    expect(result?.signatures).toHaveLength(1);
    expect(result?.signatures[0]?.parameters).toEqual([{ label: 'x' }]);
  });

  it('defaults and clamps active indices', () => {
    const twoSigs = {
      signatures: [{ label: 'a()' }, { label: 'b()' }],
      activeSignature: 9,
      activeParameter: -3,
    };
    expect(signatureHelpToMonaco(twoSigs)).toMatchObject({
      activeSignature: 1,
      activeParameter: 0,
    });
    expect(signatureHelpToMonaco({ signatures: [{ label: 'a()' }] })).toMatchObject({
      activeSignature: 0,
      activeParameter: 0,
    });
  });

  it('returns null for null, non-object, missing, and empty signatures', () => {
    expect(signatureHelpToMonaco(null)).toBeNull();
    expect(signatureHelpToMonaco('x')).toBeNull();
    expect(signatureHelpToMonaco({})).toBeNull();
    expect(signatureHelpToMonaco({ signatures: [] })).toBeNull();
    expect(signatureHelpToMonaco({ signatures: [{ label: 1 }] })).toBeNull();
  });

  it('treats a signature-level activeParameter and string documentation correctly', () => {
    const result = signatureHelpToMonaco({
      signatures: [{ label: 'f(x)', documentation: { value: 'doc' }, activeParameter: 0 }],
    });
    expect(result?.signatures[0]).toEqual({
      label: 'f(x)',
      documentation: 'doc',
      parameters: [],
      activeParameter: 0,
    });
  });
});
