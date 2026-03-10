/**
 * Progression Service
 * Manages subject progress, star accumulation, and difficulty level progression
 * Inspired by ABC Mouse step-by-step learning and ABCya grade-level organization
 */

import type { DifficultyLevel, SubjectProgress, SubjectType, WorksheetSession } from '../types';
import { dataStore } from './dataStore';

const STORAGE_KEY = 'subject-progress';
const STARS_TO_LEVEL_UP = 5;

// Difficulty progression order
const DIFFICULTY_ORDER: DifficultyLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
  'Master',
];

// Initialize default progress for all subjects
function createDefaultProgress(): Record<SubjectType, SubjectProgress> {
  const subjects: SubjectType[] = ['Math', 'Science', 'History', 'Bible', 'Language Arts'];
  const now = Date.now();

  return subjects.reduce(
    (acc, subject) => {
      acc[subject] = {
        subject,
        currentDifficulty: 'Beginner',
        starsCollected: 0,
        totalWorksheetsCompleted: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        history: [],
        unlockedAt: now,
      };
      return acc;
    },
    {} as Record<SubjectType, SubjectProgress>,
  );
}

// Load progress from dataStore
export async function loadProgress(): Promise<Record<SubjectType, SubjectProgress>> {
  try {
    const saved = await dataStore.getUserSettings(STORAGE_KEY);
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      // Merge with defaults to handle new subjects
      return { ...createDefaultProgress(), ...parsed };
    }
  } catch (error) {
    console.error('Failed to load progress from dataStore:', error);
  }
  return createDefaultProgress();
}

// Save progress to dataStore
export async function saveProgress(progress: Record<SubjectType, SubjectProgress>): Promise<void> {
  try {
    await dataStore.saveUserSettings(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress to dataStore:', error);
  }
}

// Get progress for a specific subject
export async function getSubjectProgress(subject: SubjectType): Promise<SubjectProgress> {
  const allProgress = await loadProgress();
  return allProgress[subject];
}

// Record a completed worksheet session
export async function recordWorksheetCompletion(
  subject: SubjectType,
  session: WorksheetSession,
): Promise<{
  progress: SubjectProgress;
  leveledUp: boolean;
  newDifficulty?: DifficultyLevel;
  starsEarned: number;
}> {
  const allProgress = await loadProgress();
  const subjectProgress = allProgress[subject];

  // Add session to history
  subjectProgress.history.push(session);
  if (subjectProgress.history.length > 50) {
    // Keep only last 50 sessions
    subjectProgress.history = subjectProgress.history.slice(-50);
  }

  // Update statistics
  subjectProgress.totalWorksheetsCompleted += 1;

  const scores = subjectProgress.history.map((s) => s.score ?? 0);
  subjectProgress.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  subjectProgress.bestScore = Math.max(subjectProgress.bestScore, session.score ?? 0);

  // Update streak (3+ stars)
  const starsEarned = session.starsEarned ?? 0;
  if (starsEarned >= 3) {
    subjectProgress.currentStreak += 1;
  } else {
    subjectProgress.currentStreak = 0;
  }

  // Add stars
  subjectProgress.starsCollected += starsEarned;

  // Check for level up
  let leveledUp = false;
  let newDifficulty: DifficultyLevel | undefined;

  if (subjectProgress.starsCollected >= STARS_TO_LEVEL_UP) {
    const currentIndex = DIFFICULTY_ORDER.indexOf(subjectProgress.currentDifficulty);
    if (currentIndex < DIFFICULTY_ORDER.length - 1) {
      newDifficulty = DIFFICULTY_ORDER[currentIndex + 1]!;
      subjectProgress.currentDifficulty = newDifficulty;
      subjectProgress.starsCollected = 0; // Reset stars for new level
      leveledUp = true;
    } else {
      // Already at max level, keep collecting stars
      subjectProgress.starsCollected = STARS_TO_LEVEL_UP;
    }
  }

  // Save progress
  allProgress[subject] = subjectProgress;
  await saveProgress(allProgress);

  return {
    progress: subjectProgress,
    leveledUp,
    newDifficulty,
    starsEarned,
  };
}

// Get next difficulty level
export function getNextDifficulty(current: DifficultyLevel): DifficultyLevel | null {
  const currentIndex = DIFFICULTY_ORDER.indexOf(current);
  if (currentIndex >= 0 && currentIndex < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[currentIndex + 1]!;
  }
  return null;
}

// Get progress toward next level (0-1)
export async function getProgressToNextLevel(subject: SubjectType): Promise<number> {
  const progress = await getSubjectProgress(subject);
  return progress.starsCollected / STARS_TO_LEVEL_UP;
}

// Reset progress for a subject (for testing or admin use)
export async function resetSubjectProgress(subject: SubjectType): Promise<void> {
  const allProgress = await loadProgress();
  allProgress[subject] = createDefaultProgress()[subject];
  await saveProgress(allProgress);
}

// Get all progress (for parent dashboard)
export async function getAllProgress(): Promise<Record<SubjectType, SubjectProgress>> {
  return await loadProgress();
}

// Get total stars across all subjects
export async function getTotalStars(): Promise<number> {
  const allProgress = await loadProgress();
  return Object.values(allProgress).reduce((total, prog) => {
    return total + prog.history.reduce((sum, session) => sum + (session.starsEarned ?? 0), 0);
  }, 0);
}

// Get total worksheets completed across all subjects
export async function getTotalWorksheetsCompleted(): Promise<number> {
  const allProgress = await loadProgress();
  return Object.values(allProgress).reduce(
    (total, prog) => total + prog.totalWorksheetsCompleted,
    0,
  );
}

// Complete a worksheet session (convenience function that combines recording and returns UI data)
export async function completeWorksheet(session: WorksheetSession): Promise<{
  leveledUp: boolean;
  newDifficulty?: DifficultyLevel;
  starsToNextLevel: number;
}> {
  const result = await recordWorksheetCompletion(session.subject, session);
  const starsToNextLevel = STARS_TO_LEVEL_UP - result.progress.starsCollected;

  return {
    leveledUp: result.leveledUp,
    newDifficulty: result.newDifficulty,
    starsToNextLevel: Math.max(0, starsToNextLevel),
  };
}
