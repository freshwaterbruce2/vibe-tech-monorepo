import { logger } from '../utils/logger';
import { sessionStore } from '../utils/electronStore';
import { createChatCompletion } from './secureClient';

export const breakDownTask = async (taskTitle: string, subject: string): Promise<string[]> => {
  const cacheKey = `breakdown_${subject}_${taskTitle}`.toLowerCase().replace(/\s/g, '');

  try {
    const cached = sessionStore.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e) {
    logger.error('Error reading from sessionStore', e);
  }

  const fallbackSteps = [
    `Start by reading and understanding the ${subject} topic`,
    'Gather all necessary materials and resources',
    'Break the work into 25-minute focused sessions',
    'Take notes on key concepts as you work',
    'Review and organize your completed work',
    'Double-check for accuracy and completion',
  ];

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
        model: 'deepseek-chat',
        temperature: 0.3,
        retryCount: 2,
      },
    );

    const jsonString = response?.trim();
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        const steps = parsed.steps ?? fallbackSteps;
        if (steps.length > 0) {
          try {
            sessionStore.set(cacheKey, steps);
          } catch (e) {
            logger.error('Error writing to sessionStore', e);
          }
        }
        return steps;
      } catch (parseError) {
        logger.error('Error parsing JSON response:', parseError);
        return fallbackSteps;
      }
    }
    return fallbackSteps;
  } catch (error) {
    logger.error('Error breaking down task with DeepSeek:', error);
    return fallbackSteps;
  }
};
