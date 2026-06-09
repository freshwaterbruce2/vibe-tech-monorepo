/**
 * Golden Queries Loader
 * Loads and validates the golden query set for RAG evaluation.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { GoldenQuerySet, QueryCategory, RelevanceJudgment } from './types.js';

const DEFAULT_PATH = resolve(import.meta.dirname ?? __dirname, 'golden-queries.json');

export function loadGoldenQueries(
  path: string = DEFAULT_PATH,
  category?: QueryCategory,
): RelevanceJudgment[] {
  const raw = readFileSync(path, 'utf-8');
  const data: GoldenQuerySet = JSON.parse(raw);

  // Basic validation
  if (!data.version || !Array.isArray(data.queries)) {
    throw new Error(`Invalid golden queries file: missing version or queries array`);
  }

  for (const q of data.queries) {
    if (!q.queryId || !q.queryText || !q.category || !q.relevantDocs) {
      throw new Error(`Invalid query entry: ${JSON.stringify(q).slice(0, 100)}`);
    }
  }

  let queries = data.queries;

  if (category) {
    queries = queries.filter((q) => q.category === category);
  }

  console.log(`[GoldenQueries] Loaded ${queries.length} queries${category ? ` (category: ${category})` : ''}`);
  return queries;
}
