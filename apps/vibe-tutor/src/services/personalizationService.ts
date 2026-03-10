/**
 * Personalization Service - Adaptive Learning Style Engine
 * Uses epsilon-greedy bandit algorithm to learn student's preferred explanation style
 * Tracks implicit rewards: time-to-complete, hint requests, correction rate
 */

import { dataStore } from './dataStore';

export type LearningStyle =
  | 'step-by-step' // Sequential, detailed breakdown
  | 'example-first' // Start with concrete examples
  | 'visual-mental' // Use analogies and mental models
  | 'socratic' // Guided questions
  | 'concise'; // Brief, direct answers

export interface StyleProfile {
  style: LearningStyle;
  successCount: number;
  totalAttempts: number;
  avgTimeToComplete: number; // seconds
  lastUsed: number; // timestamp
}

export interface PersonalizationProfile {
  styles: Record<LearningStyle, StyleProfile>;
  currentStyle: LearningStyle;
  epsilon: number; // exploration rate (0.1 = 10% random)
  totalInteractions: number;
}

const STORAGE_KEY = 'tutor-personalization-profile';

const DEFAULT_PROFILE: PersonalizationProfile = {
  styles: {
    'step-by-step': {
      style: 'step-by-step',
      successCount: 0,
      totalAttempts: 0,
      avgTimeToComplete: 0,
      lastUsed: 0,
    },
    'example-first': {
      style: 'example-first',
      successCount: 0,
      totalAttempts: 0,
      avgTimeToComplete: 0,
      lastUsed: 0,
    },
    'visual-mental': {
      style: 'visual-mental',
      successCount: 0,
      totalAttempts: 0,
      avgTimeToComplete: 0,
      lastUsed: 0,
    },
    socratic: {
      style: 'socratic',
      successCount: 0,
      totalAttempts: 0,
      avgTimeToComplete: 0,
      lastUsed: 0,
    },
    concise: {
      style: 'concise',
      successCount: 0,
      totalAttempts: 0,
      avgTimeToComplete: 0,
      lastUsed: 0,
    },
  },
  currentStyle: 'step-by-step', // default starting style
  epsilon: 0.15, // 15% exploration
  totalInteractions: 0,
};

class PersonalizationService {
  private profile: PersonalizationProfile;
  private sessionStart = 0;

  constructor() {
    this.profile = { ...DEFAULT_PROFILE };
    this.loadProfile().catch((e) => console.error('Failed to load personalization profile:', e));
  }

  private async loadProfile(): Promise<void> {
    try {
      const saved = await dataStore.getUserSettings(STORAGE_KEY);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        // Merge with defaults for new styles
        this.profile = {
          ...DEFAULT_PROFILE,
          ...parsed,
          styles: { ...DEFAULT_PROFILE.styles, ...parsed.styles },
        };
      }
    } catch (error) {
      console.warn('Failed to load personalization profile from dataStore:', error);
      this.profile = { ...DEFAULT_PROFILE };
    }
  }

  private async saveProfile(): Promise<void> {
    try {
      await dataStore.saveUserSettings(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (error) {
      console.error('Failed to save personalization profile to dataStore:', error);
    }
  }

  /**
   * Select next learning style using epsilon-greedy strategy
   * Returns the style to use for the next interaction
   */
  selectStyle(): LearningStyle {
    // Exploration: random style
    if (Math.random() < this.profile.epsilon) {
      const styles = Object.keys(this.profile.styles) as LearningStyle[];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)]!;
      this.profile.currentStyle = randomStyle;
      this.sessionStart = Date.now();
      return randomStyle;
    }

    // Exploitation: best performing style
    let bestStyle: LearningStyle = 'step-by-step';
    let bestScore = -Infinity;
    let hasUntriedStyle = false;
    let firstUntriedStyle: LearningStyle | null = null;

    for (const [styleName, styleProfile] of Object.entries(this.profile.styles)) {
      if (styleProfile.totalAttempts === 0) {
        // Track first untried style but don't break - continue evaluating
        if (!hasUntriedStyle) {
          hasUntriedStyle = true;
          firstUntriedStyle = styleName as LearningStyle;
        }
        continue; // Skip scoring for untried styles
      }

      // Score = success rate - time penalty
      const successRate = styleProfile.successCount / styleProfile.totalAttempts;
      const timePenalty = Math.min(styleProfile.avgTimeToComplete / 300, 1); // normalize to 5min
      const score = successRate - timePenalty * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestStyle = styleName as LearningStyle;
      }
    }

    // If we have an untried style and no tried styles have been evaluated,
    // or if all tried styles have negative scores, try the untried style
    if (hasUntriedStyle && (bestScore === -Infinity || bestScore < 0) && firstUntriedStyle) {
      bestStyle = firstUntriedStyle;
    }

    this.profile.currentStyle = bestStyle;
    this.sessionStart = Date.now();
    return bestStyle;
  }

  /**
   * Record feedback for current interaction
   * @param success - Did the student understand/complete successfully?
   * @param timeSpent - Optional: seconds spent on this interaction
   */
  recordFeedback(success: boolean, timeSpent?: number): void {
    const style = this.profile.currentStyle;
    const styleProfile = this.profile.styles[style];

    styleProfile.totalAttempts++;
    if (success) {
      styleProfile.successCount++;
    }

    // Update average time
    const actualTime = timeSpent ?? (Date.now() - this.sessionStart) / 1000;
    if (styleProfile.avgTimeToComplete === 0) {
      styleProfile.avgTimeToComplete = actualTime;
    } else {
      // Exponential moving average
      styleProfile.avgTimeToComplete = styleProfile.avgTimeToComplete * 0.7 + actualTime * 0.3;
    }

    styleProfile.lastUsed = Date.now();
    this.profile.totalInteractions++;

    // Decay epsilon over time (more exploitation as we learn)
    this.profile.epsilon = Math.max(0.05, 0.15 * Math.exp(-this.profile.totalInteractions / 50));

    this.saveProfile().catch((e) => console.error('Failed to save profile after feedback:', e));
  }

  /**
   * Get style-specific prompt modifier
   */
  getStylePrompt(style: LearningStyle): string {
    const prompts: Record<LearningStyle, string> = {
      'step-by-step': `
EXPLANATION STYLE: Step-by-Step
- Break the concept into numbered steps
- Explain each step clearly before moving to the next
- Use "First..., Then..., Finally..." structure
- Check understanding at each step`,

      'example-first': `
EXPLANATION STYLE: Example-First
- Start with a concrete, relatable example
- Show the concept in action first
- Then explain the underlying principle
- Provide 2-3 varied examples`,

      'visual-mental': `
EXPLANATION STYLE: Visual & Mental Models
- Use analogies and comparisons to familiar concepts
- Paint a mental picture or diagram description
- Explain "it's like..." relationships
- Help build intuition before formulas`,

      socratic: `
EXPLANATION STYLE: Socratic Questioning
- Guide with thoughtful questions
- Let the student discover the answer
- Ask "What do you think happens if...?"
- Build on their responses`,

      concise: `
EXPLANATION STYLE: Concise & Direct
- Get straight to the point
- Use brief, clear sentences
- Minimize extra explanation
- Provide quick, actionable answers`,
    };

    return prompts[style];
  }

  /**
   * Get current style
   */
  getCurrentStyle(): LearningStyle {
    return this.profile.currentStyle;
  }

  /**
   * Get full profile for debugging/parent dashboard
   */
  getProfile(): PersonalizationProfile {
    return { ...this.profile };
  }

  /**
   * Reset profile to defaults
   */
  reset(): void {
    this.profile = { ...DEFAULT_PROFILE };
    this.saveProfile().catch((e) => console.error('Failed to save reset profile:', e));
  }

  /**
   * Get style statistics for display
   */
  getStyleStats(): { style: LearningStyle; successRate: number; attempts: number }[] {
    return Object.values(this.profile.styles)
      .map((sp) => ({
        style: sp.style,
        successRate: sp.totalAttempts > 0 ? sp.successCount / sp.totalAttempts : 0,
        attempts: sp.totalAttempts,
      }))
      .sort((a, b) => b.successRate - a.successRate);
  }
}

// Export singleton
export const personalization = new PersonalizationService();
