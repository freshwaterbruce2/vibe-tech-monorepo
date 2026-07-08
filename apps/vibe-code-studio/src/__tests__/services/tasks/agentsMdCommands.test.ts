/**
 * agentsMdCommands tests — spec 03 AC #11 fenced-Commands parsing.
 *
 * Covers "Commands" heading discovery (any level, case-insensitive), section
 * termination at same-or-higher headings, shell vs non-shell fence languages,
 * fences outside the section, comment/blank/`$ `-prefixed lines, dedupe,
 * frontmatter stripping, graceful degradation for missing/malformed input,
 * and the label/VcsTask builders.
 */
import { describe, expect, it } from 'vitest';
import {
  type AgentsMdCommand,
  agentsMdCommandLabel,
  buildAgentsMdTask,
  extractAgentsMdCommands,
  stripFrontmatter,
} from '../../../services/tasks/agentsMdCommands';

const SOURCE = 'C:/ws/AGENTS.md';

const md = (...lines: string[]): string => lines.join('\n');

const commandsOf = (markdown: string): string[] =>
  extractAgentsMdCommands(markdown, SOURCE).map(cmd => cmd.command);

describe('extractAgentsMdCommands', () => {
  it('parses a fenced bash block under a "Commands" heading', () => {
    const markdown = md(
      '# Project',
      'Use pnpm.',
      '## Commands',
      '```bash',
      'pnpm nx test vibe-code-studio',
      'pnpm nx build vibe-code-studio',
      '```'
    );

    const commands = extractAgentsMdCommands(markdown, SOURCE);

    expect(commands.map(cmd => cmd.command)).toEqual([
      'pnpm nx test vibe-code-studio',
      'pnpm nx build vibe-code-studio',
    ]);
    expect(commands[0]).toMatchObject({ sourcePath: SOURCE });
    expect(commands[0]?.id).toMatch(/[0-9a-f-]{36}/);
    expect(commands[0]?.id).not.toBe(commands[1]?.id);
  });

  it('matches the heading case-insensitively at any level and honors `$ ` prefixes', () => {
    const markdown = md('#### COMMANDS (build & test)', '```sh', '$ pnpm build', '```');

    expect(commandsOf(markdown)).toEqual(['pnpm build']);
  });

  it('stops the section at the next heading of the same or higher level', () => {
    const markdown = md(
      '## Commands',
      '```bash',
      'pnpm lint',
      '```',
      '## Other section',
      '```bash',
      'rm -rf / # never surface me',
      '```'
    );

    expect(commandsOf(markdown)).toEqual(['pnpm lint']);
  });

  it('keeps collecting through deeper sub-headings inside the section', () => {
    const markdown = md(
      '## Commands',
      '### Build',
      '```bash',
      'pnpm build',
      '```',
      '### Test',
      '```powershell',
      'pnpm test',
      '```',
      '# Done',
      '```bash',
      'pnpm outside',
      '```'
    );

    expect(commandsOf(markdown)).toEqual(['pnpm build', 'pnpm test']);
  });

  it('accepts untagged fences and skips non-shell languages', () => {
    const markdown = md(
      '## Commands',
      '```',
      'pnpm untagged',
      '```',
      '```json',
      '{ "not": "a command" }',
      '```',
      '~~~pwsh',
      'pnpm tilde',
      '~~~',
      '```bash title=setup',
      'pnpm info-string',
      '```'
    );

    expect(commandsOf(markdown)).toEqual(['pnpm untagged', 'pnpm tilde', 'pnpm info-string']);
  });

  it('skips blanks and comments, dedupes repeats, ignores prose between fences', () => {
    const markdown = md(
      '## Commands',
      'Run these:',
      '```bash',
      '',
      '# install first',
      'pnpm install',
      'pnpm install',
      '```',
      'and also:',
      '```bash',
      'pnpm install',
      'pnpm dev',
      '```'
    );

    expect(commandsOf(markdown)).toEqual(['pnpm install', 'pnpm dev']);
  });

  it('ignores a "Commands" heading that only appears inside a code fence', () => {
    const markdown = md(
      '# Docs',
      '```markdown',
      '## Commands',
      '```',
      '```bash',
      'pnpm sneaky',
      '```'
    );

    expect(commandsOf(markdown)).toEqual([]);
  });

  it('supports multiple Commands sections', () => {
    const markdown = md(
      '## Commands',
      '```bash',
      'pnpm one',
      '```',
      '## Notes',
      'text',
      '## Commands',
      '```bash',
      'pnpm two',
      '```'
    );

    expect(commandsOf(markdown)).toEqual(['pnpm one', 'pnpm two']);
  });

  it('strips YAML frontmatter so its delimiters never corrupt parsing', () => {
    const markdown = md(
      '---',
      'activation: always',
      '---',
      '## Commands',
      '```bash',
      'pnpm after-frontmatter',
      '```'
    );

    expect(commandsOf(markdown)).toEqual(['pnpm after-frontmatter']);
  });

  it('degrades to "no commands found" for heading-less or malformed content', () => {
    expect(commandsOf('')).toEqual([]);
    expect(commandsOf('just some prose\n```bash\npnpm x\n```')).toEqual([]);
    expect(commandsOf(md('## Commands', 'no fences here at all'))).toEqual([]);
    // Unclosed fence at EOF: collected lines still surface, nothing throws.
    expect(commandsOf(md('## Commands', '```bash', 'pnpm dangling'))).toEqual(['pnpm dangling']);
  });
});

describe('stripFrontmatter', () => {
  it('returns markdown unchanged when there is no frontmatter', () => {
    expect(stripFrontmatter('# Title')).toBe('# Title');
  });

  it('returns markdown unchanged when the frontmatter never closes', () => {
    const open = '---\nactivation: always\nno closing delimiter';
    expect(stripFrontmatter(open)).toBe(open);
  });
});

describe('agentsMdCommandLabel / buildAgentsMdTask', () => {
  const command: AgentsMdCommand = { id: 'id-1', command: 'pnpm build', sourcePath: SOURCE };

  it('labels commands with an AGENTS.md prefix', () => {
    expect(agentsMdCommandLabel(command)).toBe('AGENTS.md: pnpm build');
  });

  it('shapes an ad-hoc shell VcsTask rooted at the workspace', () => {
    expect(buildAgentsMdTask(command, 'C:/ws')).toEqual({
      label: 'AGENTS.md: pnpm build',
      type: 'shell',
      command: 'pnpm build',
      cwd: 'C:/ws',
    });
  });
});
