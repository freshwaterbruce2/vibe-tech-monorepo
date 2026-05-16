// ... imports
import { logger } from '../services/Logger';
import type {
    AIContextRequest,
    AIResponse,
    DeepSeekConfig,
    WorkspaceContext
} from '../types';
import { handleApiError } from '../utils/errorHandler';

import { ConversationManager } from './ai/ConversationManager';
import { DemoResponseProvider } from './ai/DemoResponseProvider';
import { PromptBuilder } from './ai/PromptBuilder';

import type { AIChatOptions, ChatMessage } from '../types/ai';
import { DeepSeekService as StandardDeepSeekService } from './ai/providers/DeepSeekService';

// AI Safety Utilities
import {
  estimateMessageTokens,
  truncateToTokenLimit,
  getModelContextLimit,
  validateLLMOutput,
  validateStreamChunk,
  costTracker,
} from '@vibetech/shared-utils';

export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Main AI service for code assistance, chat, and completions
 * Refactored to use modular architecture for better maintainability
 */
export class DeepSeekService {
  private standardService: StandardDeepSeekService;
  private readonly conversationManager: ConversationManager;
  private config: DeepSeekConfig;
  private isDemoMode: boolean;

  constructor(config?: Partial<DeepSeekConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? import.meta.env?.['VITE_DEEPSEEK_API_KEY'] ?? 'demo_key',
      baseUrl:
        config?.baseUrl ||
        import.meta.env?.['VITE_DEEPSEEK_BASE_URL'] ||
        'https://api.deepseek.com/v1',
      model: config?.model ?? import.meta.env?.['VITE_DEEPSEEK_MODEL'] ?? 'deepseek/deepseek-v3.2',
      temperature: config?.temperature ?? 0.3,
      maxTokens: config?.maxTokens ?? 2000,
    };

    this.isDemoMode = this.config.apiKey === 'demo_key';

    // Initialize standardized Fetch-based services
    this.standardService = new StandardDeepSeekService({ apiKey: this.config.apiKey });
    this.conversationManager = new ConversationManager();
  }

  updateConfig(newConfig: Partial<DeepSeekConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.isDemoMode = this.config.apiKey === 'demo_key';

    // Re-initialize standardized services on config change
    this.standardService = new StandardDeepSeekService({ apiKey: this.config.apiKey });
  }

  async sendMessage(message: string, context?: { workspaceContext?: WorkspaceContext; currentFile?: { path: string; content: string } }): Promise<AIResponse> {
    // Legacy method for backward compatibility
    const contextRequest: AIContextRequest = {
      userQuery: message,
      relatedFiles: [],
      workspaceContext: context?.workspaceContext ?? this.getDefaultWorkspaceContext(),
      conversationHistory: this.conversationManager.getHistory(),
    };

    if (context?.currentFile) {
      contextRequest.currentFile = {
        id: context.currentFile.path,
        name: context.currentFile.path.split('/').pop() ?? 'untitled',
        path: context.currentFile.path,
        content: context.currentFile.content,
        language: this.getLanguageFromPath(context.currentFile.path),
        isModified: false
      };
    }

    return this.sendContextualMessage(contextRequest);
  }

  async sendContextualMessage(request: AIContextRequest): Promise<AIResponse> {
    try {
      if (this.isDemoMode) {
        const response = DemoResponseProvider.getContextualResponse(request);
        this.conversationManager.addUserMessage(request.userQuery);
        this.conversationManager.addAssistantMessage(response.content);
        return response;
      }

      const startTime = Date.now();

      const systemPrompt = await PromptBuilder.buildContextualSystemPrompt(request, this.config.model);

      const standardMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.conversationManager.getHistory().map(m => ({
            role: m.role as MessageRole,
            content: m.content
        })),
        { role: 'user', content: request.userQuery },
      ];

      // 🔧 FIX: Token counting and truncation
      const contextLimit = getModelContextLimit(this.config.model);
      const reserveTokens = this.config.maxTokens ?? 2000;
      const maxInputTokens = contextLimit - reserveTokens;

      const estimatedTokens = estimateMessageTokens(standardMessages);

      logger.info(`[DeepSeek] Estimated tokens: ${estimatedTokens} / ${maxInputTokens}`);

      // Truncate if exceeds limit
      let finalMessages = standardMessages;
      if (estimatedTokens > maxInputTokens) {
        logger.warn(`[DeepSeek] Token limit exceeded, truncating history...`);
        finalMessages = truncateToTokenLimit(standardMessages, maxInputTokens, {
          keepSystemMessage: true,
          reserveTokens,
        });
        logger.info(`[DeepSeek] Truncated to ${estimateMessageTokens(finalMessages)} tokens`);
      }

      // 1. Attempt DeepSeek via standardized service (Fetch)
      const chatOptions: AIChatOptions = {};
      if (this.config.model) chatOptions.model = this.config.model;
      if (this.config.temperature !== undefined) chatOptions.temperature = this.config.temperature;
      if (this.config.maxTokens !== undefined) chatOptions.maxTokens = this.config.maxTokens;

      const content = await this.standardService.chat(finalMessages, chatOptions);

      // 🔧 FIX: Output validation
      const validation = validateLLMOutput(content, {
        maxLength: 100000,
        checkHarmful: true,
        checkInjection: true,
      });

      if (!validation.valid) {
        logger.warn(`[DeepSeek] Output validation issues:`, validation.issues);
      }

      const sanitizedContent = validation.sanitized;

      const endTime = Date.now();

      // 🔧 FIX: Accurate token counting and cost tracking
      const inputTokens = estimateMessageTokens(finalMessages);
      const outputTokens = Math.ceil(sanitizedContent.length / 4); // Estimate

      costTracker.logRequest(this.config.model, inputTokens, outputTokens, {
        processingTime: endTime - startTime,
        messageCount: finalMessages.length,
      });

      // Add to conversation history
      this.conversationManager.addUserMessage(request.userQuery);
      this.conversationManager.addAssistantMessage(sanitizedContent);

      return {
        content: sanitizedContent,
        metadata: {
          model: this.config.model,
          tokens: inputTokens + outputTokens,
          processing_time: endTime - startTime,
        },
      };

    } catch (error) {
      const errorInfo = handleApiError(error);
      logger.error(`[DeepSeek] Request Failed: ${errorInfo.message}`);

      // Return error response instead of falling back
      return {
        content: `Error: Unable to generate response.\nDetails: ${errorInfo.message}`,
        metadata: { model: 'error', tokens: 0, processing_time: 0 }
      };
    }
  }

  async *sendContextualMessageStream(
    request: AIContextRequest,
    options?: AIChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const signal = options?.signal;
    let streamMessages: ChatMessage[] = [];

    try {
      if (this.isDemoMode) {
        const response = DemoResponseProvider.getContextualResponse(request);
        this.conversationManager.addUserMessage(request.userQuery);
        this.conversationManager.addAssistantMessage(response.content);

        const words = (response.content ?? '').split(' ');
        for (const word of words) {
          if (signal?.aborted) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
          yield word + ' ';
        }
        return;
      }

      const systemPrompt = await PromptBuilder.buildContextualSystemPrompt(request, this.config.model);
      streamMessages = [
          { role: 'system', content: systemPrompt },
          ...this.conversationManager.getHistory().map(m => ({
              role: m.role as MessageRole,
              content: m.content
          })),
          { role: 'user', content: request.userQuery }
      ];

      // 🔧 FIX: Token counting and truncation for streaming
      const contextLimit = getModelContextLimit(this.config.model);
      const reserveTokens = this.config.maxTokens ?? 2000;
      const maxInputTokens = contextLimit - reserveTokens;

      const estimatedTokens = estimateMessageTokens(streamMessages);

      // Truncate if exceeds limit
      let finalStreamMessages = streamMessages;
      if (estimatedTokens > maxInputTokens) {
        logger.warn(`[DeepSeek Stream] Token limit exceeded, truncating...`);
        finalStreamMessages = truncateToTokenLimit(streamMessages, maxInputTokens, {
          keepSystemMessage: true,
          reserveTokens,
        });
      }

      // 1. Stream via standardized service (Fetch)
      const chatOptions: AIChatOptions = {};
      if (this.config.model) chatOptions.model = this.config.model;
      if (this.config.temperature !== undefined) chatOptions.temperature = this.config.temperature;
      if (this.config.maxTokens !== undefined) chatOptions.maxTokens = this.config.maxTokens;
      if (signal) chatOptions.signal = signal;

      const stream = this.standardService.stream(finalStreamMessages, chatOptions);

      let fullContent = '';
      this.conversationManager.addUserMessage(request.userQuery);

      for await (const chunk of stream) {
          // 🔧 FIX: Validate each chunk
          const chunkValidation = validateStreamChunk(chunk, {
            allowHTML: false,
            checkHarmful: true,
          });

          if (!chunkValidation.valid) {
            logger.warn(`[DeepSeek Stream] Chunk validation issues:`, chunkValidation.issues);
          }

          const sanitizedChunk = chunkValidation.sanitized;
          fullContent += sanitizedChunk;
          yield sanitizedChunk;
      }

      // 🔧 FIX: Cost tracking after stream completes
      const inputTokens = estimateMessageTokens(finalStreamMessages);
      const outputTokens = Math.ceil(fullContent.length / 4);

      costTracker.logRequest(this.config.model, inputTokens, outputTokens, {
        streamMode: true,
      });

      this.conversationManager.addAssistantMessage(fullContent);

    } catch (error) {
       const errorInfo = handleApiError(error);
       logger.error(`[DeepSeek] Stream Failed: ${errorInfo.message}`);
       yield `\n\nError: Stream failed. ${errorInfo.message}`;
    }
  }

  // Helper methods required by legacy sendMessage
  private getDefaultWorkspaceContext(): WorkspaceContext {
    return {
      rootPath: '',
      totalFiles: 0,
      languages: [],
      testFiles: 0,
      projectStructure: {},
      dependencies: {},
      exports: {},
      symbols: {},
      lastIndexed: new Date(),
      summary: ''
    };
  }

  private getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop() ?? '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      default:
        return 'plaintext';
    }
  }
}
