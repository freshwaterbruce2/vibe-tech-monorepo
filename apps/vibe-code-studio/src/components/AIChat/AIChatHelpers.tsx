/**
 * AIChatHelpers
 * Constants for AIChat mode descriptions and quick actions.
 */
import type { ChatMode, ModeInfo } from './types';

export const MODE_DESCRIPTIONS: Record<ChatMode, ModeInfo> = {
  chat: {
    title: 'Chat Mode',
    description: 'Have conversations with AI, ask questions, get code explanations.',
  },
  agent: {
    title: 'Agent Mode',
    description: 'Let AI autonomously plan and execute complex multi-step tasks.',
  },
};

export const MODE_QUICK_ACTIONS: Record<ChatMode, string[]> = {
  chat: ['Explain this code', 'Generate function', 'Add comments', 'Fix bugs', 'Optimize code', 'Write tests'],
  agent: ['Create a new feature', 'Refactor this component', 'Add error handling', 'Generate test suite'],
};
