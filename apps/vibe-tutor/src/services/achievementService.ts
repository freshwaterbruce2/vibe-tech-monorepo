import { FlameIcon } from '../components/ui/icons/FlameIcon';
import { TrophyIcon } from '../components/ui/icons/TrophyIcon';
import type { Achievement, FocusSession, HomeworkItem } from '../types';
import { dataStore } from './dataStore';

export type AchievementEvent =
  | { type: 'TASK_COMPLETED' }
  | { type: 'HOMEWORK_UPDATE'; payload: { items: HomeworkItem[] } }
  | { type: 'FOCUS_SESSION_COMPLETED'; payload: { duration: number } }
  | { type: 'GAME_COMPLETED'; payload: { game: string; score: number } }
  | { type: 'WORKSHEET_COMPLETED'; payload: { subject: string; score: number } }
  | { type: 'SHOP_PURCHASE' };

// Achievement bonus points mapping
export const ACHIEVEMENT_POINTS: Record<string, number> = {
  FIRST_TASK: 25,
  FIVE_TASKS: 50,
  TEN_TASKS: 100,
  STREAK_MASTER: 150,
  FIRST_FOCUS: 25,
  FOCUS_FIVE: 50,
  FOCUS_TEN: 100,
  FOCUS_MARATHON: 150,
  DAILY_FOCUS: 200,
  FIRST_GAME: 10,
  MATH_MASTER: 50,
  WORD_WIZARD: 50,
  PATTERN_PRO: 50,
  BIG_SPENDER: 20,
};

let achievements: Achievement[] = [
  // Homework Achievements
  {
    id: 'FIRST_TASK',
    name: 'First Step',
    description: 'Complete your first homework task.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 1,
  },
  {
    id: 'FIVE_TASKS',
    name: 'Task Rabbit',
    description: 'Complete 5 homework tasks.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 5,
  },
  {
    id: 'TEN_TASKS',
    name: 'Task Master',
    description: 'Complete 10 homework tasks.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 10,
  },
  {
    id: 'STREAK_MASTER',
    name: 'Streak Master',
    description: 'Complete tasks for 3 days in a row.',
    unlocked: false,
    icon: FlameIcon,
    goal: 3,
  },

  // Focus Session Achievements
  {
    id: 'FIRST_FOCUS',
    name: 'Focus Beginner',
    description: 'Complete your first focus session.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 1,
  },
  {
    id: 'FOCUS_FIVE',
    name: 'Focus Enthusiast',
    description: 'Complete 5 focus sessions.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 5,
  },
  {
    id: 'FOCUS_TEN',
    name: 'Focus Expert',
    description: 'Complete 10 focus sessions.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 10,
  },
  {
    id: 'FOCUS_MARATHON',
    name: 'Marathon Mind',
    description: 'Focus for 100 minutes total.',
    unlocked: false,
    icon: FlameIcon,
    goal: 100,
  },
  {
    id: 'DAILY_FOCUS',
    name: 'Daily Discipline',
    description: 'Focus for 3 days in a row.',
    unlocked: false,
    icon: FlameIcon,
    goal: 3,
  },

  // Learning Game Achievements
  {
    id: 'FIRST_GAME',
    name: 'Game Player',
    description: 'Play your first learning game.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 1,
  },
  {
    id: 'MATH_MASTER',
    name: 'Math Master',
    description: 'Score 500 points in Math Adventure.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 500,
  },
  {
    id: 'WORD_WIZARD',
    name: 'Word Wizard',
    description: 'Build 50 words correctly.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 50,
  },
  {
    id: 'PATTERN_PRO',
    name: 'Pattern Pro',
    description: 'Complete 30 pattern quests.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 30,
  },
  {
    id: 'BIG_SPENDER',
    name: 'Big Spender',
    description: 'Make your first purchase in the shop.',
    unlocked: false,
    icon: TrophyIcon,
    goal: 1,
  },
];

const loadAchievements = async (): Promise<void> => {
  try {
    const saved = await dataStore.getAchievements();
    if (saved && saved.length > 0) {
      // Merge saved state with default state to handle new achievements
      achievements = achievements.map((def) => {
        const savedAch = saved.find((s: Achievement) => s.id === def.id);
        return savedAch
          ? { ...def, unlocked: savedAch.unlocked, progress: savedAch.progress }
          : def;
      });
    }
  } catch (e) {
    console.error('Failed to load achievements from dataStore', e);
  }
};

const saveAchievements = async (): Promise<void> => {
  try {
    await dataStore.saveAchievements(achievements);
  } catch (e) {
    console.error('Failed to save achievements to dataStore', e);
  }
};

// Initialize achievements on module load
loadAchievements().catch((e) => console.error('Failed to initialize achievements:', e));

export const getAchievements = async (): Promise<Achievement[]> => {
  // Update progress before returning
  const homeworkStatsJson = await dataStore.getUserSettings('homeworkStats');
  const focusStatsJson = await dataStore.getUserSettings('focusStats');

  const homeworkStats = homeworkStatsJson ? JSON.parse(homeworkStatsJson) : {};
  const focusStats = focusStatsJson ? JSON.parse(focusStatsJson) : {};

  const completedTasks = homeworkStats.completedTasks ?? 0;
  const completedSessions = focusStats.completedSessions ?? 0;
  const totalMinutes = focusStats.totalMinutes ?? 0;

  return achievements.map((ach) => {
    if (ach.id.includes('TASKS')) {
      return { ...ach, progress: Math.min(completedTasks, ach.goal ?? 0) };
    }
    if (ach.id === 'FIRST_FOCUS' || ach.id === 'FOCUS_FIVE' || ach.id === 'FOCUS_TEN') {
      return { ...ach, progress: Math.min(completedSessions, ach.goal ?? 0) };
    }
    if (ach.id === 'FOCUS_MARATHON') {
      return { ...ach, progress: Math.min(totalMinutes, ach.goal ?? 0) };
    }
    return ach;
  });
};

/**
 * Calculate the current streak of consecutive days with completed tasks
 */
const calculateStreak = (items: HomeworkItem[]): number => {
  const completedDates = items
    .filter((item) => item.completed && item.completedDate)
    .map((item) => {
      const date = new Date(item.completedDate as number);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    })
    .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
    .sort((a, b) => b - a); // Sort descending (most recent first)

  if (completedDates.length === 0) return 0;

  let streak = 1;
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < completedDates.length - 1; i++) {
    const daysDiff = (completedDates[i]! - completedDates[i + 1]!) / oneDayMs;
    if (daysDiff === 1) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
};

/**
 * Calculate the current streak of consecutive days with focus sessions
 */
const calculateFocusStreak = async (): Promise<number> => {
  const sessions = await dataStore.getFocusSessions();
  const completedDates = sessions
    .filter((s: FocusSession) => s.completed && s.startTime)
    .map((s: FocusSession) => {
      const date = new Date(s.startTime);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    })
    .filter((date: number, index: number, arr: number[]) => arr.indexOf(date) === index) // Remove duplicates
    .sort((a: number, b: number) => b - a); // Sort descending (most recent first)

  if (completedDates.length === 0) return 0;

  let streak = 1;
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < completedDates.length - 1; i++) {
    const daysDiff = (completedDates[i]! - completedDates[i + 1]!) / oneDayMs;
    if (daysDiff === 1) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
};

export interface AchievementUnlockResult {
  achievements: Achievement[];
  newlyUnlocked: Achievement[];
  totalBonusPoints: number;
}

export const checkAndUnlockAchievements = async (
  event: AchievementEvent,
): Promise<AchievementUnlockResult> => {
  let statsChanged = false;
  const homeworkStatsJson = await dataStore.getUserSettings('homeworkStats');
  const focusStatsJson = await dataStore.getUserSettings('focusStats');

  const homeworkStats = homeworkStatsJson ? JSON.parse(homeworkStatsJson) : {};
  const focusStats = focusStatsJson ? JSON.parse(focusStatsJson) : {};

  if (event.type === 'TASK_COMPLETED') {
    homeworkStats.completedTasks = (homeworkStats.completedTasks ?? 0) + 1;
    statsChanged = true;
  }

  if (event.type === 'FOCUS_SESSION_COMPLETED') {
    focusStats.completedSessions = (focusStats.completedSessions ?? 0) + 1;
    focusStats.totalMinutes = (focusStats.totalMinutes ?? 0) + event.payload.duration;
    await dataStore.saveUserSettings('focusStats', JSON.stringify(focusStats));
  }

  if (statsChanged) {
    await dataStore.saveUserSettings('homeworkStats', JSON.stringify(homeworkStats));
  }

  // Game stats tracking
  const gameStatsJson = await dataStore.getUserSettings('gameStats');
  const gameStats = gameStatsJson ? JSON.parse(gameStatsJson) : {};

  if (event.type === 'GAME_COMPLETED') {
    gameStats.gamesPlayed = (gameStats.gamesPlayed ?? 0) + 1;
    gameStats[event.payload.game] = (gameStats[event.payload.game] ?? 0) + event.payload.score;
    await dataStore.saveUserSettings('gameStats', JSON.stringify(gameStats));
  }

  if (event.type === 'WORKSHEET_COMPLETED') {
    homeworkStats.completedTasks = (homeworkStats.completedTasks ?? 0) + 1;
    await dataStore.saveUserSettings('homeworkStats', JSON.stringify(homeworkStats));
  }

  if (event.type === 'SHOP_PURCHASE') {
    gameStats.shopPurchases = (gameStats.shopPurchases ?? 0) + 1;
    await dataStore.saveUserSettings('gameStats', JSON.stringify(gameStats));
  }

  const completedTasks = homeworkStats.completedTasks ?? 0;
  const completedSessions = focusStats.completedSessions ?? 0;
  const totalMinutes = focusStats.totalMinutes ?? 0;

  // Calculate streaks
  const currentStreak = event.type === 'HOMEWORK_UPDATE' ? calculateStreak(event.payload.items) : 0;
  const focusStreak = await calculateFocusStreak();

  const newlyUnlocked: Achievement[] = [];
  let totalBonusPoints = 0;

  achievements.forEach((ach) => {
    if (ach.unlocked) return;

    let conditionMet = false;

    // Homework achievements
    if (ach.id === 'FIRST_TASK' && completedTasks >= 1) conditionMet = true;
    if (ach.id === 'FIVE_TASKS' && completedTasks >= 5) conditionMet = true;
    if (ach.id === 'TEN_TASKS' && completedTasks >= 10) conditionMet = true;
    if (ach.id === 'STREAK_MASTER' && currentStreak >= 3) conditionMet = true;

    // Focus achievements
    if (ach.id === 'FIRST_FOCUS' && completedSessions >= 1) conditionMet = true;
    if (ach.id === 'FOCUS_FIVE' && completedSessions >= 5) conditionMet = true;
    if (ach.id === 'FOCUS_TEN' && completedSessions >= 10) conditionMet = true;
    if (ach.id === 'FOCUS_MARATHON' && totalMinutes >= 100) conditionMet = true;
    if (ach.id === 'DAILY_FOCUS' && focusStreak >= 3) conditionMet = true;

    // Game achievements
    const gamesPlayed = gameStats.gamesPlayed ?? 0;
    if (ach.id === 'FIRST_GAME' && gamesPlayed >= 1) conditionMet = true;
    if (ach.id === 'MATH_MASTER' && (gameStats.mathAdventure ?? 0) >= 500) conditionMet = true;
    if (ach.id === 'WORD_WIZARD' && (gameStats.wordBuilder ?? 0) >= 50) conditionMet = true;
    if (ach.id === 'PATTERN_PRO' && (gameStats.patternQuest ?? 0) >= 30) conditionMet = true;
    if (ach.id === 'BIG_SPENDER' && (gameStats.shopPurchases ?? 0) >= 1) conditionMet = true;

    if (conditionMet) {
      ach.unlocked = true;
      newlyUnlocked.push(ach);
      totalBonusPoints += ACHIEVEMENT_POINTS[ach.id] ?? 0;
    }
  });

  await saveAchievements();

  return {
    achievements: await getAchievements(),
    newlyUnlocked,
    totalBonusPoints,
  };
};
