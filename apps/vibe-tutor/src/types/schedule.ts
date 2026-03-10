/**
 * Schedule System Types
 * Visual, tappable routines for morning and evening with timers and microsteps
 */

export type ScheduleType = 'morning' | 'evening';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ScheduleStep {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  microsteps?: string[]; // Sub-tasks (e.g., "Brush teeth" → ["Wet brush", "Add toothpaste", "Brush for 2 min"])
  order: number;
  status: StepStatus;
  completedAt?: number; // Timestamp
  skippedReason?: string;
}

export interface DailySchedule {
  id: string;
  type: ScheduleType;
  title: string;
  description?: string;
  steps: ScheduleStep[];
  createdAt: number;
  updatedAt: number;
  active: boolean; // Whether this schedule is currently in use
}

export interface ScheduleProgress {
  scheduleId: string;
  date: string; // YYYY-MM-DD
  completedSteps: string[]; // Step IDs
  totalSteps: number;
  completionPercentage: number;
  completedAt?: number;
  tokensEarned?: number; // Rewards for completion
}

// API payload types
export interface CreateSchedulePayload {
  type: ScheduleType;
  title: string;
  description?: string;
  steps: Omit<ScheduleStep, 'id' | 'status' | 'completedAt'>[];
}

export interface UpdateSchedulePayload {
  title?: string;
  description?: string;
  steps?: ScheduleStep[];
  active?: boolean;
}

export interface UpdateStepStatusPayload {
  stepId: string;
  status: StepStatus;
  skippedReason?: string;
}

