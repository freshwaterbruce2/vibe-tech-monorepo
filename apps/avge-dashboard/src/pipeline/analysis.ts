/**
 * 3M Hook Analysis Module
 *
 * Extracts "The 3M Anxiety Hook" patterns from NotebookLM sources:
 * - Hooks: Rhetorical questions, statistics, stories
 * - Structures: Narrative patterns and storytelling arcs
 * - Anxiety Points: Financial, personal, career triggers with resolutions
 */

import type { AnxietyTrigger, HookAnalysis, HookPattern, StoryStructure } from '../types';
import { queryNotebook } from './notebook';

const HOOK_EXTRACTION_PROMPT = `Analyze the source material and extract:

1. **HOOKS** (opening lines that grab attention):
   - Rhetorical questions that trigger curiosity
   - Shocking statistics or data points
   - Personal stories that create immediate empathy
   - Controversial statements that demand engagement

2. **STORY STRUCTURES** (narrative patterns):
   - How do the top-performing videos organize information?
   - What arc do they follow? (Problem → Agitation → Solution?)
   - Where do they place their strongest hooks?

3. **ANXIETY TRIGGERS** (emotional leverage points):
   - Financial fears (missing out, losing money, falling behind)
   - Personal insecurities (not being good enough, imposter syndrome)
   - Career anxiety (being replaced, stagnation)
   - Health/wellbeing concerns

4. **RETENTION GAPS** (where viewers drop off and why):
   - Identify segments where engagement likely drops
   - Suggest pacing fixes

Return your analysis as structured JSON.`;

/**
 * Extract 3M Hook patterns from a notebook's sources.
 */
export async function extract3MHooks(notebookId: string): Promise<HookAnalysis> {
  console.log('[Analysis] Extracting 3M Hook patterns...');

  const response = await queryNotebook(notebookId, HOOK_EXTRACTION_PROMPT);

  // Phase 2: Parse structured JSON from NLM response
  // For now, return empty analysis structure
  return parseHookAnalysis(response.answer);
}

/**
 * Extract retention gap analysis from notebook sources.
 */
export async function analyzeRetentionGaps(notebookId: string): Promise<string[]> {
  const response = await queryNotebook(
    notebookId,
    'What are the key retention gaps in these videos? Where do viewers likely lose interest and why?',
  );

  return [response.answer];
}

/**
 * Generate competitive baseline from source analysis.
 */
export async function generateCompetitiveBaseline(
  notebookId: string,
): Promise<{ strengths: string[]; weaknesses: string[]; opportunities: string[] }> {
  const response = await queryNotebook(
    notebookId,
    'Compare the source videos: What common strengths do top performers share? What weaknesses can we exploit? What content gaps exist?',
  );

  return {
    strengths: [response.answer],
    weaknesses: [],
    opportunities: [],
  };
}

function parseHookAnalysis(rawResponse: string): HookAnalysis {
  // Phase 2: Implement robust JSON parsing with fallbacks
  try {
    const parsed = JSON.parse(rawResponse);
    return parsed as HookAnalysis;
  } catch {
    return {
      hooks: [] as HookPattern[],
      structures: [] as StoryStructure[],
      anxietyPoints: [] as AnxietyTrigger[],
      retentionGaps: [rawResponse],
    };
  }
}

export { HOOK_EXTRACTION_PROMPT };
