import { appStore } from '../utils/electronStore';

/**
 * Daily Affirmations System
 * Positive mindset reinforcement for neurodivergent learners
 *
 * Research-based CBT technique:
 * - Counters negative self-talk
 * - Builds self-esteem and confidence
 * - Reinforces growth mindset
 * - Reduces anxiety and depression symptoms
 */

export interface Affirmation {
  id: string;
  category: 'strength' | 'effort' | 'progress' | 'kindness' | 'belonging' | 'capability';
  text: string;
  reflection?: string; // Optional follow-up question
}

export interface DailyAffirmationEntry {
  date: string; // YYYY-MM-DD
  morningAffirmation: Affirmation;
  eveningReflection?: string;
  mood?: 'great' | 'good' | 'okay' | 'struggling';
  timestamp: number;
}

// Curated affirmations for neurodivergent learners
export const AFFIRMATIONS: Affirmation[] = [
  // Strength-based
  {
    id: 'strength-1',
    category: 'strength',
    text: "My brain works differently, and that's one of my strengths.",
    reflection: 'What unique way of thinking helped me today?',
  },
  {
    id: 'strength-2',
    category: 'strength',
    text: 'I have talents and abilities that are valuable.',
    reflection: "What's one thing I'm good at?",
  },
  {
    id: 'strength-3',
    category: 'strength',
    text: 'My attention to detail is a superpower.',
  },
  {
    id: 'strength-4',
    category: 'strength',
    text: "I bring a unique perspective that others don't have.",
  },
  {
    id: 'strength-5',
    category: 'strength',
    text: 'My interests and passions make me who I am.',
  },

  // Effort-based (growth mindset)
  {
    id: 'effort-1',
    category: 'effort',
    text: "I'm proud of myself for trying, even when it's hard.",
    reflection: 'What did I try today that felt challenging?',
  },
  {
    id: 'effort-2',
    category: 'effort',
    text: 'Every small step forward counts.',
  },
  {
    id: 'effort-3',
    category: 'effort',
    text: "Making mistakes means I'm learning and growing.",
  },
  {
    id: 'effort-4',
    category: 'effort',
    text: "I don't have to be perfect. I just have to keep trying.",
  },
  {
    id: 'effort-5',
    category: 'effort',
    text: "It's okay to ask for help when I need it.",
  },
  {
    id: 'effort-6',
    category: 'effort',
    text: 'Progress is progress, no matter how slow.',
  },

  // Progress-focused
  {
    id: 'progress-1',
    category: 'progress',
    text: "I've come further than I think.",
    reflection: "What's something I can do now that I couldn't do a year ago?",
  },
  {
    id: 'progress-2',
    category: 'progress',
    text: "I'm learning new things every day.",
  },
  {
    id: 'progress-3',
    category: 'progress',
    text: "I'm getting better at handling challenges.",
  },
  {
    id: 'progress-4',
    category: 'progress',
    text: 'I notice small improvements, and they matter.',
  },
  {
    id: 'progress-5',
    category: 'progress',
    text: "Today I'm one step closer to my goals.",
  },

  // Self-kindness
  {
    id: 'kindness-1',
    category: 'kindness',
    text: 'I deserve kindness, especially from myself.',
    reflection: 'How can I be gentler with myself today?',
  },
  {
    id: 'kindness-2',
    category: 'kindness',
    text: "It's okay to have bad days. Tomorrow is a fresh start.",
  },
  {
    id: 'kindness-3',
    category: 'kindness',
    text: "I'm doing the best I can, and that's enough.",
  },
  {
    id: 'kindness-4',
    category: 'kindness',
    text: "I forgive myself for mistakes. They don't define me.",
  },
  {
    id: 'kindness-5',
    category: 'kindness',
    text: 'I can take breaks when I need them.',
  },
  {
    id: 'kindness-6',
    category: 'kindness',
    text: "My feelings are valid, even when others don't understand.",
  },

  // Belonging
  {
    id: 'belonging-1',
    category: 'belonging',
    text: 'I belong, just as I am.',
    reflection: 'Where do I feel most like myself?',
  },
  {
    id: 'belonging-2',
    category: 'belonging',
    text: 'There are people who appreciate me for who I am.',
  },
  {
    id: 'belonging-3',
    category: 'belonging',
    text: "I don't have to change myself to fit in.",
  },
  {
    id: 'belonging-4',
    category: 'belonging',
    text: 'My differences make me interesting, not weird.',
  },
  {
    id: 'belonging-5',
    category: 'belonging',
    text: 'I deserve friends who accept me as I am.',
  },

  // Capability
  {
    id: 'capability-1',
    category: 'capability',
    text: 'I can handle whatever today brings.',
    reflection: 'What challenge did I overcome recently?',
  },
  {
    id: 'capability-2',
    category: 'capability',
    text: 'I have the skills and resources I need.',
  },
  {
    id: 'capability-3',
    category: 'capability',
    text: "I've gotten through 100% of my worst days so far.",
  },
  {
    id: 'capability-4',
    category: 'capability',
    text: 'I trust myself to figure things out.',
  },
  {
    id: 'capability-5',
    category: 'capability',
    text: 'I am capable of learning new things.',
  },
];

/**
 * Get daily affirmation (consistent for each calendar day)
 */
export function getDailyAffirmation(date: Date = new Date()): Affirmation {
  // Use date as seed for consistent daily affirmation
  const dateStr = date.toISOString().split('T')[0]!; // YYYY-MM-DD
  const seed = dateStr.split('-').reduce((sum, part) => sum + parseInt(part, 10), 0);
  const index = seed % AFFIRMATIONS.length;

  return AFFIRMATIONS[index]!;
}

/**
 * Get random affirmation
 */
export function getRandomAffirmation(): Affirmation {
  const index = Math.floor(Math.random() * AFFIRMATIONS.length);
  return AFFIRMATIONS[index]!;
}

/**
 * Get affirmations by category
 */
export function getAffirmationsByCategory(category: Affirmation['category']): Affirmation[] {
  return AFFIRMATIONS.filter((a) => a.category === category);
}

/**
 * Save daily affirmation entry
 */
export function saveDailyEntry(entry: DailyAffirmationEntry): void {
  try {
    const existing = getAffirmationHistory();

    // Check if entry for this date already exists
    const existingIndex = existing.findIndex((e) => e.date === entry.date);

    if (existingIndex >= 0) {
      // Update existing entry
      existing[existingIndex] = entry;
    } else {
      // Add new entry
      existing.push(entry);
    }

    // Keep last 90 days
    const limited = existing.slice(-90);

    appStore.set('daily_affirmations', JSON.stringify(limited));
    console.debug('[Affirmations] Saved daily entry');
  } catch (error) {
    console.error('[Affirmations] Failed to save entry:', error);
  }
}

/**
 * Get affirmation history
 */
export function getAffirmationHistory(): DailyAffirmationEntry[] {
  try {
    const saved = appStore.get<DailyAffirmationEntry[]>('daily_affirmations');
    return saved ?? [];
  } catch (error) {
    console.warn('[Affirmations] Failed to load history:', error);
    return [];
  }
}

/**
 * Get today's entry (if exists)
 */
export function getTodayEntry(): DailyAffirmationEntry | null {
  const today = new Date().toISOString().split('T')[0]!;
  const history = getAffirmationHistory();
  return history.find((e) => e.date === today) ?? null;
}

/**
 * Get current streak (consecutive days with entries)
 */
export function getCurrentStreak(): number {
  const history = getAffirmationHistory();

  if (history.length === 0) return 0;

  // Sort by date descending
  const sorted = history.sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const entryDate = new Date(sorted[i]!.date);
    entryDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get statistics for parent dashboard
 */
export function getAffirmationStats() {
  const history = getAffirmationHistory();

  if (history.length === 0) {
    return {
      totalDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      entriesThisWeek: 0,
      entriesThisMonth: 0,
      moodTrend: 'stable' as 'improving' | 'stable' | 'declining',
    };
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString().split('T')[0]!;

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthAgoStr = oneMonthAgo.toISOString().split('T')[0]!;

  const entriesThisWeek = history.filter((e) => e.date >= weekAgoStr).length;
  const entriesThisMonth = history.filter((e) => e.date >= monthAgoStr).length;

  // Calculate longest streak
  const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
  let longestStreak = 0;
  let currentStreakCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      currentStreakCount = 1;
    } else {
      const prevDate = new Date(sorted[i - 1]!.date);
      const currDate = new Date(sorted[i]!.date);
      const diffDays = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        currentStreakCount++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreakCount);
        currentStreakCount = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, currentStreakCount);

  // Mood trend (last 7 days vs previous 7 days)
  const recentMoods = history
    .filter(
      (e): e is DailyAffirmationEntry & { mood: NonNullable<DailyAffirmationEntry['mood']> } =>
        Boolean(e.mood) && e.date >= weekAgoStr,
    )
    .map((e) => moodToScore(e.mood));

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0]!;

  const previousMoods = history
    .filter(
      (e): e is DailyAffirmationEntry & { mood: NonNullable<DailyAffirmationEntry['mood']> } =>
        Boolean(e.mood) && e.date >= twoWeeksAgoStr && e.date < weekAgoStr,
    )
    .map((e) => moodToScore(e.mood));

  let moodTrend: 'improving' | 'stable' | 'declining' = 'stable';

  if (recentMoods.length > 0 && previousMoods.length > 0) {
    const recentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    const previousAvg = previousMoods.reduce((a, b) => a + b, 0) / previousMoods.length;

    if (recentAvg > previousAvg + 0.5) moodTrend = 'improving';
    else if (recentAvg < previousAvg - 0.5) moodTrend = 'declining';
  }

  return {
    totalDays: history.length,
    currentStreak: getCurrentStreak(),
    longestStreak,
    entriesThisWeek,
    entriesThisMonth,
    moodTrend,
  };
}

/**
 * Convert mood to numeric score (for trend calculation)
 */
function moodToScore(mood: 'great' | 'good' | 'okay' | 'struggling'): number {
  const scores = {
    great: 4,
    good: 3,
    okay: 2,
    struggling: 1,
  };
  return scores[mood];
}
