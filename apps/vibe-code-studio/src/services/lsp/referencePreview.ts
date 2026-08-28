/**
 * Cross-file reference peek preview (spec 07 polish). Monaco's peek widget can
 * only render a snippet for a location whose URI resolves to a live text model;
 * cross-file targets have no model in this single-editor app, so the reference
 * provider creates lightweight preview models on demand from file content read
 * via the injected `readFile`. Pure given the injected monaco slice.
 */

import type { DefinitionTarget } from './lspNavigation';
import { uriToFilePath } from './uri';

/** The slice of the Monaco namespace preview-model creation needs. */
export interface PreviewMonaco {
  Uri: { file: (path: string) => unknown };
  editor: {
    getModel: (uri: unknown) => unknown;
    createModel: (value: string, language: string | undefined, uri: unknown) => unknown;
  };
}

/** Distinct Windows paths of targets living in files OTHER than the active one. */
export function crossFileTargetPaths(targets: DefinitionTarget[], activePath: string): string[] {
  const paths = new Set<string>();
  for (const target of targets) {
    const path = uriToFilePath(target.uri);
    if (path !== activePath) paths.add(path);
  }
  return [...paths];
}

/**
 * Ensure a text model exists for every cross-file reference target so the peek
 * widget shows a real snippet instead of an empty preview. Missing `readFile`,
 * unreadable files, and already-modeled URIs are all skipped silently — the
 * peek then degrades to Monaco's default for those entries.
 */
export async function ensurePreviewModels(
  monaco: PreviewMonaco,
  targets: DefinitionTarget[],
  activePath: string,
  readFile: ((path: string) => Promise<string | undefined>) | undefined
): Promise<void> {
  if (!readFile) return;
  for (const path of crossFileTargetPaths(targets, activePath)) {
    const uri = monaco.Uri.file(path);
    if (monaco.editor.getModel(uri)) continue;
    let content: string | undefined;
    try {
      content = await readFile(path);
    } catch {
      continue; // unreadable → peek shows the bare location for this file
    }
    if (typeof content !== 'string') continue;
    monaco.editor.createModel(content, undefined, uri);
  }
}
