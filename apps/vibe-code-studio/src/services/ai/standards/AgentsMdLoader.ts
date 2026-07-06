/**
 * AgentsMdLoader — spec 03 (Open Agent Standards) Phase 1.
 *
 * Discovers AGENTS.md files from the workspace root down to the active file's
 * directory (closest-wins), parses them into RulesParser `Rule` objects, and
 * renders a source-tagged prompt section consumed by PromptBuilder /
 * SystemPromptBuilder alongside `.deepcoderules`.
 *
 * AGENTS.md is free-form markdown. Real YAML frontmatter (leading `---`) is
 * parsed through RulesParser; anything else is injected verbatim as a single
 * always-apply rule so markdown horizontal rules never corrupt parsing.
 */
import { type Rule, RulesParser } from '../../RulesParser';

/** Minimal reader seam — a throwing readFile means "file absent". */
export interface StandardsFileReader {
  readFile(path: string): Promise<string>;
}

export interface AgentsMdDocument {
  /** Path the content was read from (as passed to the reader). */
  sourcePath: string;
  rules: Rule[];
}

export const AGENTS_MD_FILENAME = 'AGENTS.md';

const toPosix = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '');

/** Relative posix path of `filePath` under `root`, or null when outside it. */
export function relativeToRoot(root: string, filePath: string): string | null {
  const normRoot = toPosix(root);
  const normFile = toPosix(filePath);
  if (normRoot && normFile.toLowerCase().startsWith(`${normRoot.toLowerCase()}/`)) {
    return normFile.slice(normRoot.length + 1);
  }
  const looksAbsolute = /^([a-zA-Z]:\/|\/)/.test(normFile);
  return looksAbsolute ? null : normFile;
}

/**
 * Candidate AGENTS.md paths ordered root-first → closest-last.
 * Without a target file only the workspace root is checked.
 */
export function candidateAgentsMdPaths(workspaceRoot: string, targetFilePath?: string): string[] {
  const root = toPosix(workspaceRoot);
  if (!root) {
    return [];
  }
  const dirs = [root];
  const relative = targetFilePath ? relativeToRoot(root, targetFilePath) : null;
  if (relative) {
    const segments = relative.split('/').slice(0, -1);
    let current = root;
    for (const segment of segments) {
      current = `${current}/${segment}`;
      dirs.push(current);
    }
  }
  return dirs.map(dir => `${dir}/${AGENTS_MD_FILENAME}`);
}

/**
 * Parse one AGENTS.md body. Frontmatter-shaped content goes through
 * RulesParser; free-form markdown (or a parser failure) falls back to a
 * single always-apply rule carrying the raw body.
 */
export function parseAgentsMd(content: string, parser: RulesParser = new RulesParser()): Rule[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }
  const rawRule: Rule = {
    content: trimmed,
    scope: 'global',
    priority: 'normal',
    alwaysApply: true,
  };
  if (!trimmed.startsWith('---')) {
    return [rawRule];
  }
  try {
    const parsed = parser.parse(trimmed, AGENTS_MD_FILENAME);
    return parsed.rules.length > 0 ? parsed.rules : [rawRule];
  } catch {
    return [rawRule];
  }
}

/** Load and parse every AGENTS.md between the root and the target file. */
export async function loadAgentsMdDocuments(
  reader: StandardsFileReader,
  workspaceRoot: string,
  targetFilePath?: string
): Promise<AgentsMdDocument[]> {
  const documents: AgentsMdDocument[] = [];
  for (const sourcePath of candidateAgentsMdPaths(workspaceRoot, targetFilePath)) {
    try {
      const rules = parseAgentsMd(await reader.readFile(sourcePath));
      if (rules.length > 0) {
        documents.push({ sourcePath, rules });
      }
    } catch {
      // Absent file — expected for most directories.
    }
  }
  return documents;
}

/** Render documents as a source-tagged prompt section ('' when nothing applies). */
export function buildAgentsStandardsSection(
  documents: AgentsMdDocument[],
  targetRelativePath?: string,
  parser: RulesParser = new RulesParser()
): string {
  const blocks: string[] = [];
  for (const doc of documents) {
    const applicable = targetRelativePath
      ? doc.rules.filter(rule => parser.matchesFile(rule, targetRelativePath))
      : doc.rules;
    if (applicable.length === 0) {
      continue;
    }
    const body = parser
      .sortByPriority(applicable)
      .map(rule => rule.content)
      .join('\n\n');
    blocks.push(`<!-- source: ${doc.sourcePath} -->\n${body}`);
  }
  if (blocks.length === 0) {
    return '';
  }
  return [
    '',
    '',
    'PROJECT AGENT STANDARDS (AGENTS.md):',
    'Sections are ordered root-first; on conflict the LATER (closest) section wins.',
    blocks.join('\n\n'),
    '',
  ].join('\n');
}

/**
 * One-call convenience: discover, parse, filter and render. Never throws —
 * standards loading must never break prompt construction.
 */
export async function loadAgentsStandardsSection(
  reader: StandardsFileReader,
  workspaceRoot: string,
  targetFilePath?: string
): Promise<string> {
  try {
    const documents = await loadAgentsMdDocuments(reader, workspaceRoot, targetFilePath);
    const relative = targetFilePath
      ? (relativeToRoot(workspaceRoot, targetFilePath) ?? undefined)
      : undefined;
    return buildAgentsStandardsSection(documents, relative);
  } catch {
    return '';
  }
}
