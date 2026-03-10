import { appStore } from '../utils/electronStore';
import { SCENARIOS } from './buddyScenariosData';

/**
 * Buddy Role-Play Scenarios
 * Structured social interaction practice with safety guardrails
 * Research-based for neurodivergent learners (November 2025)
 */

export type ScenarioCategory =
  | 'greeting'
  | 'conversation'
  | 'conflict'
  | 'group'
  | 'online'
  | 'school'
  | 'family'
  | 'self-advocacy'
  | 'dating'
  | 'household'
  | 'money'
  | 'responsibility';

export interface RolePlayScenario {
  id: string;
  category: ScenarioCategory;
  title: string;
  description: string;
  context: string;
  yourRole: string;
  otherRole: string;
  goal: string;
  difficulty: 'easy' | 'medium' | 'hard';
  skillsTaught: string[];
  safetyBoundaries: string[];
  reflectionPrompts: string[];
}

// Re-export data for consumers
export { SCENARIOS };

/**
 * Get scenario by ID
 */
export function getScenario(id: string): RolePlayScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: ScenarioCategory): RolePlayScenario[] {
  return SCENARIOS.filter((s) => s.category === category);
}

/**
 * Get scenarios by difficulty
 */
export function getScenariosByDifficulty(
  difficulty: 'easy' | 'medium' | 'hard',
): RolePlayScenario[] {
  return SCENARIOS.filter((s) => s.difficulty === difficulty);
}

/**
 * Get random scenario
 */
export function getRandomScenario(category?: ScenarioCategory): RolePlayScenario {
  const pool = category ? getScenariosByCategory(category) : SCENARIOS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * Generate system prompt for role-play scenario
 */
export function generateScenarioPrompt(scenario: RolePlayScenario): string {
  return `You are Vibe, helping a high school student practice social interactions through role-play.

CURRENT SCENARIO: ${scenario.title}
Context: ${scenario.context}

YOUR ROLE: You are playing "${scenario.otherRole}"
Student's Role: ${scenario.yourRole}
Goal: ${scenario.goal}

SKILLS BEING PRACTICED:
${scenario.skillsTaught.map((skill) => `- ${skill}`).join('\n')}

SAFETY BOUNDARIES (important reminders for the student):
${scenario.safetyBoundaries.map((boundary) => `- ${boundary}`).join('\n')}

HOW TO PLAY THIS ROLE:
1. Stay in character as ${scenario.otherRole}
2. Respond naturally as this person would
3. Give realistic reactions (positive, neutral, or mildly negative as appropriate)
4. Provide subtle cues about how the interaction is going
5. Don't make it too easy or too hard - be realistic
6. If the student seems stuck, gently guide them
7. After 3-5 exchanges, offer to move to reflection

TONE:
- Natural and realistic (not overly positive or negative)
- Age-appropriate for high school
- Helpful but not preachy
- Keep responses brief (2-4 sentences usually)

Remember: This is practice. The goal is learning, not perfection.`;
}

/**
 * Generate reflection prompt after role-play
 */
export function generateReflectionPrompt(scenario: RolePlayScenario): string {
  return `Great job practicing! Let's reflect on that interaction.

${scenario.reflectionPrompts.map((prompt, i) => `${i + 1}. ${prompt}`).join('\n')}

Take your time. There are no wrong answers - this is about learning what works for you.`;
}

/**
 * Track scenario progress
 */
export interface ScenarioProgress {
  scenarioId: string;
  completedAt: number;
  reflectionNotes?: string;
  skillsRating: number; // 1-5 self-rating
}

const PROGRESS_STORAGE_KEY = 'buddy-scenario-progress';

export function saveScenarioProgress(progress: ScenarioProgress): void {
  try {
    const existing = getScenarioProgress();
    existing.push(progress);
    appStore.set(PROGRESS_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Failed to save scenario progress:', error);
  }
}

export function getScenarioProgress(): ScenarioProgress[] {
  try {
    const saved = appStore.get<ScenarioProgress[]>(PROGRESS_STORAGE_KEY);
    return saved ?? [];
  } catch (error) {
    console.warn('Failed to load scenario progress:', error);
    return [];
  }
}

export function getCompletedScenarios(): string[] {
  return getScenarioProgress().map((p) => p.scenarioId);
}
