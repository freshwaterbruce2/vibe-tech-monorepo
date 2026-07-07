/**
 * agentsMdCommands — spec 03 (Open Agent Standards) AC #11.
 *
 * Parses fenced shell blocks under an AGENTS.md "Commands" heading into
 * one-click actions, mirroring how .vcs/tasks.json (spec 02) surfaces
 * commands. Execution reuses TaskRunnerService/TerminalService — each command
 * runs as an ad-hoc shell VcsTask; no new runner. Malformed or heading-less
 * content degrades to "no commands found" (empty list), never throws.
 */
import type { VcsTask } from './types';

export interface AgentsMdCommand {
  id: string;
  /** The shell command line exactly as written in the fenced block. */
  command: string;
  /** AGENTS.md path the command was parsed from. */
  sourcePath: string;
}

/** Fence languages accepted as shell commands ('' = untagged fence). */
const SHELL_LANGS = new Set(['', 'bash', 'sh', 'shell', 'powershell', 'pwsh', 'zsh', 'cmd']);

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const COMMANDS_HEADING_RE = /^commands\b/i;
const FENCE_RE = /^(?:```|~~~)(.*)$/;

/** First token of a fence info string ('' for untagged fences). */
function fenceLang(info: string): string {
  return info.trim().replace(/\s[\s\S]*$/, '');
}

/** Drop a leading YAML frontmatter block so `---` never reads as content. */
export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---')) {
    return markdown;
  }
  const end = markdown.indexOf('\n---', 3);
  return end === -1 ? markdown : markdown.slice(end + 4);
}

/** Normalize one fenced-block line into a runnable command ('' = skip it). */
function toCommandLine(line: string): string {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return '';
  }
  return trimmed.startsWith('$ ') ? trimmed.slice(2).trim() : trimmed;
}

interface SectionState {
  /** Heading level of the active Commands section, or 0 when outside one. */
  level: number;
  /** Inside a shell-language fence within the active section. */
  inShellFence: boolean;
  /** Inside a non-shell fence (contents ignored, headings inside skipped). */
  inOtherFence: boolean;
}

function updateSectionForHeading(state: SectionState, line: string): boolean {
  const heading = HEADING_RE.exec(line);
  if (!heading || state.inShellFence || state.inOtherFence) {
    return false;
  }
  const level = (heading[1] ?? '').length;
  if (COMMANDS_HEADING_RE.test((heading[2] ?? '').trim())) {
    state.level = level;
  } else if (state.level !== 0 && level <= state.level) {
    state.level = 0; // same-or-higher heading ends the Commands section
  }
  return true;
}

/**
 * Extract commands from every fenced shell block under a "Commands" heading
 * (any level, case-insensitive), stopping each section at the next heading of
 * the same or higher level. Lines are deduped; blank/comment lines skipped.
 */
export function extractAgentsMdCommands(markdown: string, sourcePath: string): AgentsMdCommand[] {
  const seen = new Set<string>();
  const commands: AgentsMdCommand[] = [];
  const state: SectionState = { level: 0, inShellFence: false, inOtherFence: false };
  for (const line of stripFrontmatter(markdown).split(/\r?\n/)) {
    if (updateSectionForHeading(state, line)) {
      continue;
    }
    const fence = FENCE_RE.exec(line.trim());
    if (fence) {
      if (state.inShellFence || state.inOtherFence) {
        state.inShellFence = false;
        state.inOtherFence = false;
      } else {
        const isShell =
          state.level !== 0 && SHELL_LANGS.has(fenceLang(fence[1] ?? '').toLowerCase());
        state.inShellFence = isShell;
        state.inOtherFence = !isShell;
      }
      continue;
    }
    if (state.inShellFence) {
      const command = toCommandLine(line);
      if (command !== '' && !seen.has(command)) {
        seen.add(command);
        commands.push({ id: crypto.randomUUID(), command, sourcePath });
      }
    }
  }
  return commands;
}

/** Task-runner label for an AGENTS.md command (also keys running state). */
export function agentsMdCommandLabel(command: AgentsMdCommand): string {
  return `AGENTS.md: ${command.command}`;
}

/** Shape an AGENTS.md command as an ad-hoc shell task for TaskRunnerService. */
export function buildAgentsMdTask(command: AgentsMdCommand, workspaceRoot: string): VcsTask {
  return {
    label: agentsMdCommandLabel(command),
    type: 'shell',
    command: command.command,
    cwd: workspaceRoot,
  };
}
