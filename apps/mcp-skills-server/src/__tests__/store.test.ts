import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock filesystem and gray-matter before store is imported
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('gray-matter', () => ({
  default: vi.fn((raw: string) => {
    // Minimal frontmatter parser for tests
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { data: {}, content: raw };
    const data: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
      const [k, ...v] = line.split(':');
      if (k) data[k.trim()] = v.join(':').trim();
    }
    return { data, content: match[2] };
  }),
}));

import { readFile, readdir, stat } from 'node:fs/promises';
import { searchSkills, invalidateCache } from '../store.js';

const mockReaddir = vi.mocked(readdir);
const mockStat = vi.mocked(stat);
const mockReadFile = vi.mocked(readFile);

function makeStatResult(isDirectory: boolean, isFile: boolean) {
  return { isDirectory: () => isDirectory, isFile: () => isFile } as Awaited<ReturnType<typeof stat>>;
}

function makeDirent(name: string, isDir: boolean) {
  return { name, isDirectory: () => isDir } as Awaited<ReturnType<typeof readdir>>[number];
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidateCache();

  // Default: source directories don't exist → zero skills returned
  mockStat.mockRejectedValue(new Error('ENOENT'));
});

describe('searchSkills', () => {
  it('returns empty results when no skills are loaded', async () => {
    const results = await searchSkills('anything');
    expect(results).toEqual([]);
  });

  it('matches skill names and scores higher than description matches', async () => {
    // Arrange: make one source dir exist with two skills
    mockStat
      .mockResolvedValueOnce(makeStatResult(true, false))  // source dir exists
      .mockResolvedValueOnce(makeStatResult(false, true))  // skill-one/SKILL.md
      .mockResolvedValueOnce(makeStatResult(false, true))  // skill-two/SKILL.md
      .mockRejectedValue(new Error('ENOENT'));             // second source dir missing

    mockReaddir.mockResolvedValueOnce([
      makeDirent('skill-one', true),
      makeDirent('skill-two', true),
    ] as Awaited<ReturnType<typeof readdir>>);

    mockReadFile
      .mockResolvedValueOnce('---\nname: commit helper\ndescription: automates commits\n---\nContent one')
      .mockResolvedValueOnce('---\nname: lint fixer\ndescription: fixes lint errors in commit messages\n---\nContent two');

    invalidateCache();

    // "commit" matches name of skill-one (score 10) and description of skill-two (score 5)
    const results = await searchSkills('commit');
    expect(results.length).toBeGreaterThanOrEqual(1);
    // The skill whose name contains "commit" should rank first
    expect(results[0].skill.name).toBe('commit helper');
    expect(results[0].score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it('gives a 50-point bonus for exact id match', async () => {
    mockStat
      .mockResolvedValueOnce(makeStatResult(true, false))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockRejectedValue(new Error('ENOENT'));

    mockReaddir.mockResolvedValueOnce([makeDirent('my-skill', true)] as Awaited<ReturnType<typeof readdir>>);
    mockReadFile.mockResolvedValueOnce('---\nname: My Skill\ndescription: does things\n---\n');

    invalidateCache();

    const results = await searchSkills('my-skill');
    expect(results[0].score).toBeGreaterThanOrEqual(50);
  });

  it('respects the limit parameter', async () => {
    mockStat
      .mockResolvedValueOnce(makeStatResult(true, false))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockRejectedValue(new Error('ENOENT'));

    mockReaddir.mockResolvedValueOnce([
      makeDirent('skill-a', true),
      makeDirent('skill-b', true),
      makeDirent('skill-c', true),
    ] as Awaited<ReturnType<typeof readdir>>);

    mockReadFile
      .mockResolvedValueOnce('---\nname: alpha tool\ndescription: test helper\n---\n')
      .mockResolvedValueOnce('---\nname: beta tool\ndescription: test helper\n---\n')
      .mockResolvedValueOnce('---\nname: gamma tool\ndescription: test helper\n---\n');

    invalidateCache();

    const results = await searchSkills('tool', 2);
    expect(results).toHaveLength(2);
  });

  it('returns results sorted by score descending', async () => {
    mockStat
      .mockResolvedValueOnce(makeStatResult(true, false))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockRejectedValue(new Error('ENOENT'));

    mockReaddir.mockResolvedValueOnce([
      makeDirent('low-match', true),
      makeDirent('high-match', true),
    ] as Awaited<ReturnType<typeof readdir>>);

    mockReadFile
      .mockResolvedValueOnce('---\nname: other thing\ndescription: git helper\n---\n')
      .mockResolvedValueOnce('---\nname: git commit\ndescription: git helper for commits\n---\n');

    invalidateCache();

    const results = await searchSkills('git');
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
  });
});

describe('invalidateCache', () => {
  it('forces a fresh scan on the next listSkills call', async () => {
    // First scan: no skills
    mockStat.mockRejectedValue(new Error('ENOENT'));
    const r1 = await searchSkills('anything');
    expect(r1).toHaveLength(0);

    // Invalidate and set up a skill for the second scan
    invalidateCache();
    mockStat
      .mockResolvedValueOnce(makeStatResult(true, false))
      .mockResolvedValueOnce(makeStatResult(false, true))
      .mockRejectedValue(new Error('ENOENT'));
    mockReaddir.mockResolvedValueOnce([makeDirent('new-skill', true)] as Awaited<ReturnType<typeof readdir>>);
    mockReadFile.mockResolvedValueOnce('---\nname: new skill\ndescription: something\n---\n');

    const r2 = await searchSkills('new skill');
    expect(r2.length).toBeGreaterThan(0);
  });
});
