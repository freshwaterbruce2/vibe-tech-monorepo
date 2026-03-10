/**
 * Skill metadata parsed from SKILL.md frontmatter
 */
export interface SkillMeta {
  /** Skill identifier (folder name) */
  id: string;
  /** Display name from frontmatter */
  name: string;
  /** Description for LLM tool selection */
  description: string;
  /** Absolute path to SKILL.md */
  path: string;
  /** Source repository (monorepo or community) */
  source: 'monorepo' | 'community';
}

/**
 * Skill content with full markdown body
 */
export interface Skill extends SkillMeta {
  /** Full markdown content (after frontmatter) */
  content: string;
}

/**
 * Search result with relevance scoring
 */
export interface SkillSearchResult {
  skill: SkillMeta;
  score: number;
  matchedIn: ('name' | 'description' | 'content')[];
}
