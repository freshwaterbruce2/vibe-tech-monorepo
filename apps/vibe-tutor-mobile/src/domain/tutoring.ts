export type TutorPlan = 'free' | 'plus' | 'family';
export type Subject = 'Math' | 'Reading' | 'Science' | 'Executive Function';

export interface HomeworkTask {
  id: string;
  title: string;
  subject: Subject;
  minutes: number;
  completed: boolean;
}

export interface TutorMessage {
  id: string;
  role: 'student' | 'tutor';
  text: string;
}

export interface LessonCard {
  id: string;
  title: string;
  subject: Subject;
  minutes: number;
  premium: boolean;
  prompt: string;
}

export const starterLessons: LessonCard[] = [
  {
    id: 'fractions',
    title: 'Fraction rescue',
    subject: 'Math',
    minutes: 8,
    premium: false,
    prompt: 'Show fraction work with drawings, then ask one check-for-understanding question.',
  },
  {
    id: 'reading-main-idea',
    title: 'Main idea finder',
    subject: 'Reading',
    minutes: 7,
    premium: false,
    prompt: 'Help the learner identify the main idea and two text clues.',
  },
  {
    id: 'focus-plan',
    title: 'Focus sprint planner',
    subject: 'Executive Function',
    minutes: 12,
    premium: true,
    prompt: 'Break the assignment into timed chunks with a sensory-friendly reset.',
  },
  {
    id: 'science-lab',
    title: 'Lab report coach',
    subject: 'Science',
    minutes: 15,
    premium: true,
    prompt: 'Guide the learner through claim, evidence, and reasoning without writing for them.',
  },
];

export const seedTasks: HomeworkTask[] = [
  {
    id: 'math-practice',
    title: 'Finish math practice set',
    subject: 'Math',
    minutes: 20,
    completed: false,
  },
  {
    id: 'reading-log',
    title: 'Read and summarize one chapter',
    subject: 'Reading',
    minutes: 25,
    completed: false,
  },
];

export function buildTutorReply(input: string, lesson?: LessonCard): string {
  const topic = input.trim() || lesson?.title || 'your assignment';
  const opening = lesson ? `For ${lesson.title}, start small:` : 'Start small:';
  return `${opening} tell me what you already know about ${topic}. Then we will solve one step, check it, and only move on when it feels clear.`;
}

export function calculateFocusMinutes(tasks: readonly HomeworkTask[]): number {
  return tasks.reduce((total, task) => total + (task.completed ? task.minutes : 0), 0);
}

export function calculateTokenBalance(tasks: readonly HomeworkTask[]): number {
  return tasks.filter((task) => task.completed).length * 15;
}
