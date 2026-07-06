/**
 * AgentsMdLoader Tests — spec 03 (Open Agent Standards) Phase 1.
 *
 * Covers discovery (candidateAgentsMdPaths / relativeToRoot), parsing
 * (frontmatter via real RulesParser, free-form fallback), document loading
 * over an in-memory reader, and section rendering (filtering, ordering,
 * priority sorting, source tags).
 */

import { describe, expect, it } from 'vitest';
import {
  AGENTS_MD_FILENAME,
  buildAgentsStandardsSection,
  candidateAgentsMdPaths,
  loadAgentsMdDocuments,
  loadAgentsStandardsSection,
  parseAgentsMd,
  relativeToRoot,
} from '../../../services/ai/standards/AgentsMdLoader';
import type {
  AgentsMdDocument,
  StandardsFileReader,
} from '../../../services/ai/standards/AgentsMdLoader';
import { RulesParser } from '../../../services/RulesParser';

/** In-memory reader — rejecting readFile means "file absent". */
const mapReader = (files: Map<string, string>): StandardsFileReader => ({
  readFile: (path: string): Promise<string> => {
    const content = files.get(path);
    if (content === undefined) {
      return Promise.reject(new Error(`ENOENT: ${path}`));
    }
    return Promise.resolve(content);
  },
});

const frontmatterDoc = (globs: string, body: string): string =>
  ['---', `globs: ["${globs}"]`, '---', body].join('\n');

describe('AgentsMdLoader', () => {
  describe('relativeToRoot', () => {
    it('resolves a windows backslash path under the root', () => {
      expect(relativeToRoot('C:\\ws', 'C:\\ws\\src\\a.ts')).toBe('src/a.ts');
    });

    it('resolves a posix path under the root', () => {
      expect(relativeToRoot('/home/user/ws', '/home/user/ws/src/a.ts')).toBe('src/a.ts');
    });

    it('tolerates a trailing slash on the root', () => {
      expect(relativeToRoot('C:/ws/', 'C:/ws/src/a.ts')).toBe('src/a.ts');
    });

    it('matches the root case-insensitively while preserving file casing', () => {
      expect(relativeToRoot('c:/ws', 'C:/Ws/src/A.ts')).toBe('src/A.ts');
    });

    it('returns null for a drive-letter absolute path outside the root', () => {
      expect(relativeToRoot('C:/ws', 'D:/other/a.ts')).toBeNull();
    });

    it('returns null for a posix absolute path outside the root', () => {
      expect(relativeToRoot('C:/ws', '/etc/hosts')).toBeNull();
    });

    it('passes an already-relative path through unchanged', () => {
      expect(relativeToRoot('C:/ws', 'src/a.ts')).toBe('src/a.ts');
    });

    it('passes a relative path through when the root is empty', () => {
      expect(relativeToRoot('', 'src/a.ts')).toBe('src/a.ts');
    });

    it('returns null for an absolute path when the root is empty', () => {
      expect(relativeToRoot('', 'C:/x/a.ts')).toBeNull();
    });
  });

  describe('candidateAgentsMdPaths', () => {
    it('returns only the root candidate when no target is given', () => {
      expect(candidateAgentsMdPaths('C:\\ws')).toEqual([`C:/ws/${AGENTS_MD_FILENAME}`]);
    });

    it('walks root-first through every intermediate directory of a nested target', () => {
      expect(candidateAgentsMdPaths('C:/ws', 'C:/ws/src/app/Button.tsx')).toEqual([
        'C:/ws/AGENTS.md',
        'C:/ws/src/AGENTS.md',
        'C:/ws/src/app/AGENTS.md',
      ]);
    });

    it('returns a single candidate for a target directly in the root', () => {
      expect(candidateAgentsMdPaths('C:/ws', 'C:/ws/index.ts')).toEqual(['C:/ws/AGENTS.md']);
    });

    it('falls back to the root only when the target is outside the root', () => {
      expect(candidateAgentsMdPaths('C:/ws', 'D:/other/x.ts')).toEqual(['C:/ws/AGENTS.md']);
    });

    it('returns no candidates for an empty workspace root', () => {
      expect(candidateAgentsMdPaths('')).toEqual([]);
    });
  });

  describe('parseAgentsMd', () => {
    it('returns no rules for empty content', () => {
      expect(parseAgentsMd('')).toEqual([]);
    });

    it('returns no rules for whitespace-only content', () => {
      expect(parseAgentsMd('  \n\t ')).toEqual([]);
    });

    it('wraps free-form markdown in a single always-apply raw rule', () => {
      const body = ['# Standards', '', 'Prefer composition.'].join('\n');
      const rules = parseAgentsMd(`\n${body}\n`);
      expect(rules).toHaveLength(1);
      expect(rules[0]?.content).toBe(body);
      expect(rules[0]?.scope).toBe('global');
      expect(rules[0]?.priority).toBe('normal');
      expect(rules[0]?.alwaysApply).toBe(true);
    });

    it('treats a mid-document horizontal rule as plain markdown', () => {
      const body = ['# Title', '', 'Part one.', '', '---', '', 'Part two.'].join('\n');
      const rules = parseAgentsMd(body);
      expect(rules).toHaveLength(1);
      expect(rules[0]?.content).toBe(body);
      expect(rules[0]?.alwaysApply).toBe(true);
    });

    it('parses leading YAML frontmatter into structured rules', () => {
      const content = [
        '---',
        'description: TS rules',
        'globs: ["**/*.ts"]',
        'priority: high',
        '---',
        'Use strict mode.',
      ].join('\n');
      const rules = parseAgentsMd(content);
      expect(rules).toHaveLength(1);
      expect(rules[0]?.description).toBe('TS rules');
      expect(rules[0]?.globs).toEqual(['**/*.ts']);
      expect(rules[0]?.priority).toBe('high');
      expect(rules[0]?.content).toBe('Use strict mode.');
      expect(rules[0]?.scope).toBe('file-specific');
    });

    it('falls back to a raw rule when frontmatter parsing throws', () => {
      const content = ['---', 'globs: notanarray', '---', 'body'].join('\n');
      const rules = parseAgentsMd(content, new RulesParser());
      expect(rules).toHaveLength(1);
      expect(rules[0]?.content).toBe(content);
      expect(rules[0]?.alwaysApply).toBe(true);
      expect(rules[0]?.scope).toBe('global');
    });

    it('falls back to a raw rule when frontmatter parsing yields zero rules', () => {
      const content = '---\n---';
      const rules = parseAgentsMd(content);
      expect(rules).toHaveLength(1);
      expect(rules[0]?.content).toBe(content);
      expect(rules[0]?.alwaysApply).toBe(true);
    });
  });

  describe('loadAgentsMdDocuments', () => {
    it('loads existing documents root-first and skips missing files silently', async () => {
      const files = new Map([
        ['C:/ws/AGENTS.md', 'Root standards'],
        ['C:/ws/src/app/AGENTS.md', 'App standards'],
      ]);
      const docs = await loadAgentsMdDocuments(
        mapReader(files),
        'C:\\ws',
        'C:\\ws\\src\\app\\Button.tsx'
      );
      expect(docs.map(d => d.sourcePath)).toEqual(['C:/ws/AGENTS.md', 'C:/ws/src/app/AGENTS.md']);
      expect(docs[0]?.rules[0]?.content).toBe('Root standards');
      expect(docs[1]?.rules[0]?.content).toBe('App standards');
    });

    it('produces no document for an empty-content file', async () => {
      const files = new Map([['C:/ws/AGENTS.md', '   \n']]);
      const docs = await loadAgentsMdDocuments(mapReader(files), 'C:/ws');
      expect(docs).toEqual([]);
    });

    it('returns no documents when every read fails', async () => {
      const docs = await loadAgentsMdDocuments(mapReader(new Map()), 'C:/ws', 'C:/ws/src/a.ts');
      expect(docs).toEqual([]);
    });
  });

  describe('buildAgentsStandardsSection', () => {
    const rawDoc = (sourcePath: string, content: string): AgentsMdDocument => ({
      sourcePath,
      rules: parseAgentsMd(content),
    });

    it('returns an empty string for no documents', () => {
      expect(buildAgentsStandardsSection([])).toBe('');
    });

    it('drops documents whose rules do not match the target file', () => {
      const docs = [
        rawDoc('C:/ws/AGENTS.md', frontmatterDoc('**/*.ts', 'TypeScript standards apply')),
        rawDoc('C:/ws/src/AGENTS.md', frontmatterDoc('**/*.py', 'Python standards apply')),
      ];
      const section = buildAgentsStandardsSection(docs, 'src/index.ts');
      expect(section).toContain('TypeScript standards apply');
      expect(section).not.toContain('Python standards apply');
      expect(section).not.toContain('C:/ws/src/AGENTS.md');
    });

    it('returns an empty string when no rule matches the target file', () => {
      const docs = [rawDoc('C:/ws/AGENTS.md', frontmatterDoc('**/*.py', 'Python only'))];
      expect(buildAgentsStandardsSection(docs, 'src/index.ts')).toBe('');
    });

    it('includes all rules when no target relative path is given', () => {
      const docs = [
        rawDoc('C:/ws/AGENTS.md', frontmatterDoc('**/*.ts', 'TypeScript standards apply')),
        rawDoc('C:/ws/src/AGENTS.md', frontmatterDoc('**/*.py', 'Python standards apply')),
      ];
      const section = buildAgentsStandardsSection(docs);
      expect(section).toContain('TypeScript standards apply');
      expect(section).toContain('Python standards apply');
    });

    it('renders the header, closest-wins sentence, and source tags root-first', () => {
      const docs = [
        rawDoc('C:/ws/AGENTS.md', 'Root guidance'),
        rawDoc('C:/ws/src/AGENTS.md', 'Closest guidance'),
      ];
      const section = buildAgentsStandardsSection(docs);
      expect(section).toContain('PROJECT AGENT STANDARDS (AGENTS.md):');
      expect(section).toContain(
        'Sections are ordered root-first; on conflict the LATER (closest) section wins.'
      );
      const rootIdx = section.indexOf('<!-- source: C:/ws/AGENTS.md -->');
      const nestedIdx = section.indexOf('<!-- source: C:/ws/src/AGENTS.md -->');
      expect(rootIdx).toBeGreaterThanOrEqual(0);
      expect(nestedIdx).toBeGreaterThan(rootIdx);
    });

    it('sorts rules within a document by priority (high before normal)', () => {
      const doc: AgentsMdDocument = {
        sourcePath: 'C:/ws/AGENTS.md',
        rules: [
          {
            content: 'normal-priority rule',
            scope: 'global',
            priority: 'normal',
            alwaysApply: true,
          },
          { content: 'high-priority rule', scope: 'global', priority: 'high', alwaysApply: true },
        ],
      };
      const section = buildAgentsStandardsSection([doc], undefined, new RulesParser());
      const highIdx = section.indexOf('high-priority rule');
      const normalIdx = section.indexOf('normal-priority rule');
      expect(highIdx).toBeGreaterThanOrEqual(0);
      expect(highIdx).toBeLessThan(normalIdx);
    });
  });

  describe('loadAgentsStandardsSection', () => {
    it('discovers, filters, and renders nested AGENTS.md files end-to-end', async () => {
      const files = new Map([
        ['C:/ws/AGENTS.md', 'Root guidance'],
        ['C:/ws/src/AGENTS.md', frontmatterDoc('**/*.ts', 'TS-only guidance')],
      ]);
      const section = await loadAgentsStandardsSection(
        mapReader(files),
        'C:\\ws',
        'C:\\ws\\src\\index.ts'
      );
      expect(section).toContain('PROJECT AGENT STANDARDS (AGENTS.md):');
      expect(section).toContain('Root guidance');
      expect(section).toContain('TS-only guidance');
      const rootIdx = section.indexOf('<!-- source: C:/ws/AGENTS.md -->');
      const nestedIdx = section.indexOf('<!-- source: C:/ws/src/AGENTS.md -->');
      expect(nestedIdx).toBeGreaterThan(rootIdx);
    });

    it('returns an empty string without a target when only the root is probed', async () => {
      const section = await loadAgentsStandardsSection(mapReader(new Map()), 'C:/ws');
      expect(section).toBe('');
    });

    it('returns an empty string when the reader throws for every path', async () => {
      const section = await loadAgentsStandardsSection(
        mapReader(new Map()),
        'C:/ws',
        'C:/ws/src/deep/file.ts'
      );
      expect(section).toBe('');
    });

    it('skips per-file filtering when the target lies outside the root', async () => {
      const files = new Map([['C:/ws/AGENTS.md', frontmatterDoc('**/*.rs', 'Rust-only guidance')]]);
      const section = await loadAgentsStandardsSection(
        mapReader(files),
        'C:/ws',
        'D:/other/main.py'
      );
      expect(section).toContain('Rust-only guidance');
    });

    it('returns an empty string when discovery itself throws (catch-all)', async () => {
      // A non-string root makes candidateAgentsMdPaths throw inside the guard.
      const badRoot = undefined as unknown as string;
      const section = await loadAgentsStandardsSection(mapReader(new Map()), badRoot);
      expect(section).toBe('');
    });
  });
});
