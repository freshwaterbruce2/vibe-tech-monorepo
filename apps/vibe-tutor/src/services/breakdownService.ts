import { logger } from '../utils/logger';
import { sessionStore } from '../utils/electronStore';
import { createChatCompletion } from './secureClient';

export type TaskBreakdownResult =
  | { status: 'success'; steps: string[] }
  | { status: 'unavailable'; message: string };

const unavailable = (): TaskBreakdownResult => ({
  status: 'unavailable',
  message: 'AI-generated steps are unavailable right now. Please try again.',
});

const hasUsableSteps = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((step) => typeof step === 'string' && step.trim().length > 0);

export const breakDownTask = async (taskTitle: string, subject: string): Promise<TaskBreakdownResult> => {
  const cacheKey = `breakdown_${subject}_${taskTitle}`.toLowerCase().replace(/\s/g, '');

  try {
    const cached = sessionStore.get<string[]>(cacheKey);
    if (hasUsableSteps(cached)) {
      return { status: 'success', steps: cached };
    }
  } catch (e) {
    logger.error('Error reading from sessionStore', e);
  }

  try {
    const prompt = `Break down the following homework task into a series of small, manageable steps.
        Task: "${taskTitle}"
        Subject: "${subject}"
        Provide the steps as a simple list of strings.`;

    const response = await createChatCompletion(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        chatType: 'tutor',
      },
    );

    const jsonString = response?.trim();
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        const steps = parsed?.steps;
        if (hasUsableSteps(steps)) {
          try {
            sessionStore.set(cacheKey, steps);
          } catch (e) {
            logger.error('Error writing to sessionStore', e);
          }
          return { status: 'success', steps };
        }
        logger.error('Task breakdown response did not contain usable steps');
        return unavailable();
      } catch (parseError) {
        logger.error('Error parsing JSON response:', parseError);
        return unavailable();
      }
    }
    return unavailable();
  } catch (error) {
    logger.error('Error breaking down task with DeepSeek:', error);
    return unavailable();
  }
};
