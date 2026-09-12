import { createChatCompletion } from './secureClient';

export interface ScheduleSuggestion {
  time: string;
  activity: string;
  durationMinutes: number;
  type: string;
}

const MAX_SCHEDULE_DURATION_MINUTES = 720;
const SCHEDULE_TIME_PATTERN = /^(1[0-2]|[1-9]):([0-5]\d)\s+(AM|PM)$/i;

function normalizeScheduleSuggestion(value: unknown): ScheduleSuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.time !== 'string' ||
    typeof item.activity !== 'string' ||
    typeof item.type !== 'string' ||
    typeof item.durationMinutes !== 'number' ||
    !Number.isSafeInteger(item.durationMinutes) ||
    item.durationMinutes <= 0 ||
    item.durationMinutes > MAX_SCHEDULE_DURATION_MINUTES
  ) return null;

  const time = item.time.trim().match(SCHEDULE_TIME_PATTERN);
  const activity = item.activity.trim();
  const type = item.type.trim();
  const hour = time?.[1];
  const minute = time?.[2];
  const meridian = time?.[3];
  if (!hour || !minute || !meridian || !activity || !type) return null;

  return {
    time: `${Number(hour)}:${minute} ${meridian.toUpperCase()}`,
    activity,
    durationMinutes: item.durationMinutes,
    type,
  };
}

export async function generateScheduleSuggestion(context: {
  peakHours: number[];
  energyLevel: 1 | 2 | 3;
  homeworkTitles: string[];
}): Promise<ScheduleSuggestion[]> {
  const content = await createChatCompletion(
    [{
      role: 'user',
      content: `Create a JSON array of after-school schedule items from peak hours ${context.peakHours.join(', ')}, energy ${context.energyLevel}, and homework ${context.homeworkTitles.join(', ')}. Every item must contain time in exact 12-hour h:mm AM/PM format, nonblank activity, a positive integer durationMinutes, and nonblank type.`,
    }],
    { chatType: 'tutor' },
  );
  const match = content?.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Schedule suggestion did not contain a JSON array');

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error('Schedule suggestion contained malformed JSON');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Schedule suggestion did not contain valid schedule items');
  }

  const suggestions: ScheduleSuggestion[] = [];
  for (const item of parsed) {
    const suggestion = normalizeScheduleSuggestion(item);
    if (!suggestion) throw new Error('Schedule suggestion did not contain valid schedule items');
    suggestions.push(suggestion);
  }
  return suggestions;
}
