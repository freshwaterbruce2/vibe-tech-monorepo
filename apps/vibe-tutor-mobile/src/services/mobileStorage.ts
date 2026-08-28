import type { HomeworkTask, TutorPlan } from '../domain/tutoring';
import { seedTasks } from '../domain/tutoring';

const planKey = 'vibe_tutor_mobile_plan';
const tasksKey = 'vibe_tutor_mobile_tasks';

export function loadPlan(): TutorPlan {
  const stored = window.localStorage.getItem(planKey);
  return stored === 'plus' || stored === 'family' ? stored : 'free';
}

export function savePlan(plan: TutorPlan): void {
  window.localStorage.setItem(planKey, plan);
}

export function loadTasks(): HomeworkTask[] {
  const raw = window.localStorage.getItem(tasksKey);
  if (!raw) {
    return seedTasks;
  }

  try {
    const parsed = JSON.parse(raw) as HomeworkTask[];
    return Array.isArray(parsed) ? parsed : seedTasks;
  } catch {
    return seedTasks;
  }
}

export function saveTasks(tasks: readonly HomeworkTask[]): void {
  window.localStorage.setItem(tasksKey, JSON.stringify(tasks));
}
