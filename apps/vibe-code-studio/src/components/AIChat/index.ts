/**
 * AIChat Module
 * Modular AI chat interface with chat and agent modes
 */
export { default as AIChat, default } from './AIChat';
export { MessageItem, TypingMessage } from './MessageItem';
export { copyToClipboard, formatTime } from './MessageItem.helpers';
export { MemoizedStepCard } from './StepCard';
export { getStepIcon } from './StepCard.helpers';
export type {
  AIChatProps,
  ChatMode,
  MemoizedStepCardProps,
  MessageItemProps,
  ModeInfo,
} from './types';
export { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from './types';
