import matter from 'gray-matter';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Skill, SkillMeta, SkillSearchResult } from './types.js';

/** Skill source directories */
const SKILL_SOURCES = [
  { path: 'C:\\dev\\.agent\\skills', source: 'monorepo' as const },
  { path: 'C:\\dev\\antigravity-awesome-skills\\skills', source: 'community' as const },
];

/** Cached skill index */
let skillCache: SkillMeta[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Scan all skill directories and parse SKILL.md files
 */
async function scanSkills(): Promise<SkillMeta[]> {
  const skills: SkillMeta[] = [];

  for (const { path: sourceDir, source } of SKILL_SOURCES) {
    try {
      // Check if directory exists before scanning
      const dirStats = await stat(sourceDir).catch(() => null);
      if (!dirStats?.isDirectory()) {
        console.warn(`[Skills] Skipping non-existent source: ${sourceDir}`);
        continue;
      }

      const entries = await readdir(sourceDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = join(sourceDir, entry.name);
        const skillFile = join(skillDir, 'SKILL.md');

        try {
          const stats = await stat(skillFile);
          if (!stats.isFile()) continue;

          const raw = await readFile(skillFile, 'utf-8');
          const { data } = matter(raw);

          skills.push({
            id: entry.name,
            name: String(data.name ?? entry.name),
            description: String(data.description ?? 'No description'),
            path: skillFile,
            source,
          });
        } catch {
          // No SKILL.md in this folder, skip
        }
      }
    } catch (err) {
      console.error(`Failed to scan ${sourceDir}:`, err);
    }
  }

  return skills;
}

/**
 * Get all skills (cached)
 */
export async function listSkills(): Promise<SkillMeta[]> {
  const now = Date.now();
  if (skillCache && now - cacheTime < CACHE_TTL_MS) {
    return skillCache;
  }

  skillCache = await scanSkills();
  cacheTime = now;
  return skillCache;
}

/**
 * Get a skill by ID
 */
export async function getSkill(id: string): Promise<Skill | null> {
  const skills = await listSkills();
  const meta = skills.find((s) => s.id === id);
  if (!meta) return null;

  const raw = await readFile(meta.path, 'utf-8');
  const { content } = matter(raw);

  return { ...meta, content };
}

/**
 * Search skills by query (simple keyword matching)
 */
export async function searchSkills(query: string, limit = 10): Promise<SkillSearchResult[]> {
  const skills = await listSkills();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const results: SkillSearchResult[] = [];

  for (const skill of skills) {
    const matchedIn: ('name' | 'description' | 'content')[] = [];
    let score = 0;

    const nameLower = skill.name.toLowerCase();
    const descLower = skill.description.toLowerCase();

    for (const term of terms) {
      if (nameLower.includes(term)) {
        score += 10;
        if (!matchedIn.includes('name')) matchedIn.push('name');
      }
      if (descLower.includes(term)) {
        score += 5;
        if (!matchedIn.includes('description')) matchedIn.push('description');
      }
    }

    // Exact ID match bonus
    if (skill.id.toLowerCase() === query.toLowerCase()) {
      score += 50;
    }

    if (score > 0) {
      results.push({ skill, score, matchedIn });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Invalidate the skill cache (e.g., after adding new skills)
 */
export function invalidateCache(): void {
  skillCache = null;
  cacheTime = 0;
}
