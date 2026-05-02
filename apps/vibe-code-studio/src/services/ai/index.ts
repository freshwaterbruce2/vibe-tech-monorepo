// AI service module exports
export { AutoImportProvider } from './AutoImportProvider';
export { ConversationManager } from './ConversationManager';
export { DeepSeekService } from './providers/DeepSeekService';
export { DemoResponseProvider } from './DemoResponseProvider';

export { PromptBuilder } from './PromptBuilder';
export { UnifiedAIService } from './UnifiedAIService';

export type {
    AIChatMessage,
    AIClientConfig,
    AICodeContext,
    AICompletionRequest,
    AICompletionResponse,
    AIStreamResponse,
    AISystemMessage
} from './types';
