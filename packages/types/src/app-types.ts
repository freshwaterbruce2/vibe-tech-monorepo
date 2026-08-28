/**
 * @vibetech/types - Application Types
 * Shared type definitions extracted from vibe-tutor app
 */

import type { FC, SVGProps } from 'react';

// Core Homework/Task Types
export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedDate?: number;
}

export interface ParsedHomework {
  subject: string;
  title: string;
  dueDate: string;
}

// Gamification Types
export interface Achievement {
  id: string;
  name: string;
  title?: string;
  description: string;
  unlocked: boolean;
  icon: FC<SVGProps<SVGSVGElement>>;
  goal?: number;
  progress?: number;
  progressGoal?: number;
  pointsAwarded?: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  pointsRequired?: number;
  description?: string;
}

export interface ClaimedReward extends Reward {
  claimedDate: number;
  claimedAt?: string;
}

// View Types
export type View =
  | 'dashboard' | 'tutor' | 'friend' | 'achievements' | 'parent'
  | 'music' | 'sensory' | 'focus' | 'cards' | 'games' | 'schedules'
  | 'buddy' | 'tokens' | 'parent-rules' | 'learning' | 'shop';

// Mood Types
export type Mood = 'awful' | 'bad' | 'okay' | 'good' | 'great';

export interface MoodEntry {
  mood: Mood;
  note: string;
  timestamp: number;
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// Subject Types
export type SubjectType = 'Math' | 'Science' | 'History' | 'Bible' | 'Language Arts';
export type CardLevel = 'Basic' | 'Advanced' | 'Master';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master';
export type QuestionType = 'multiple-choice' | 'fill-blank' | 'true-false' | 'matching';

export interface SubjectCard {
  id: string;
  subject: SubjectType;
  level: CardLevel;
  xp: number;
  xpToNextLevel: number;
  homeworkCompleted: number;
  shiny: boolean;
  unlockedAt: number;
  lastEvolved?: number;
}

// Schedule Types
export type ScheduleType = 'morning' | 'evening';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ScheduleStep {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  order: number;
  status: StepStatus;
}

// Notification Types
export type NotificationType = 'error' | 'warning' | 'success' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

// Games Types
export type ObbyType = 'math' | 'science' | 'word' | 'history';
export type BrainGameType = 'crossword' | 'wordsearch' | 'sudoku' | 'memory' | 'anagrams';
