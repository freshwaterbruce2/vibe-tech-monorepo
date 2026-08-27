/**
 * Pure mappers for `textDocument/signatureHelp` → Monaco's SignatureHelp shape
 * (spec 07 polish, AC #5). No Monaco value import — plain objects matching
 * Monaco's interfaces, same contract as `lspNavigation.ts`.
 */

import { documentationString } from './lspNavigation';

/** Monaco `languages.ParameterInformation` (label may be a [start,end] span). */
export interface MonacoParameterInformation {
  label: string | [number, number];
  documentation?: string;
}

/** Monaco `languages.SignatureInformation`. */
export interface MonacoSignatureInformation {
  label: string;
  documentation?: string;
  parameters: MonacoParameterInformation[];
  activeParameter?: number;
}

/** Monaco `languages.SignatureHelp`. */
export interface MonacoSignatureHelp {
  signatures: MonacoSignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

interface LspParameterInformation {
  label?: string | [number, number];
  documentation?: string | { value?: string };
}

interface LspSignatureInformation {
  label?: string;
  documentation?: string | { value?: string };
  parameters?: unknown[];
  activeParameter?: number;
}

function isLabelSpan(label: unknown): label is [number, number] {
  return (
    Array.isArray(label) &&
    label.length === 2 &&
    typeof label[0] === 'number' &&
    typeof label[1] === 'number'
  );
}

function mapParameter(item: unknown): MonacoParameterInformation | null {
  if (!item || typeof item !== 'object') return null;
  const parameter = item as LspParameterInformation;
  const label = isLabelSpan(parameter.label)
    ? parameter.label
    : typeof parameter.label === 'string'
      ? parameter.label
      : null;
  if (label === null) return null;
  const mapped: MonacoParameterInformation = { label };
  const documentation = documentationString(parameter.documentation);
  if (documentation) mapped.documentation = documentation;
  return mapped;
}

function mapSignature(item: unknown): MonacoSignatureInformation | null {
  if (!item || typeof item !== 'object') return null;
  const signature = item as LspSignatureInformation;
  if (typeof signature.label !== 'string') return null;
  const parameters = Array.isArray(signature.parameters)
    ? signature.parameters
        .map(mapParameter)
        .filter((parameter): parameter is MonacoParameterInformation => parameter !== null)
    : [];
  const mapped: MonacoSignatureInformation = { label: signature.label, parameters };
  const documentation = documentationString(signature.documentation);
  if (documentation) mapped.documentation = documentation;
  if (typeof signature.activeParameter === 'number') {
    mapped.activeParameter = signature.activeParameter;
  }
  return mapped;
}

/**
 * LSP `SignatureHelp` → Monaco `SignatureHelp`; null when there are no valid
 * signatures (Monaco then keeps its built-in behavior). Out-of-range active
 * indices clamp to 0.
 */
export function signatureHelpToMonaco(result: unknown): MonacoSignatureHelp | null {
  if (!result || typeof result !== 'object') return null;
  const help = result as {
    signatures?: unknown[];
    activeSignature?: number;
    activeParameter?: number;
  };
  if (!Array.isArray(help.signatures)) return null;
  const signatures = help.signatures
    .map(mapSignature)
    .filter((signature): signature is MonacoSignatureInformation => signature !== null);
  if (signatures.length === 0) return null;
  const clamp = (value: number | undefined): number =>
    typeof value === 'number' && value >= 0 ? value : 0;
  return {
    signatures,
    activeSignature: Math.min(clamp(help.activeSignature), signatures.length - 1),
    activeParameter: clamp(help.activeParameter),
  };
}
