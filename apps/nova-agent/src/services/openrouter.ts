/**
 * OpenRouter Service - Moonshot Direct Mode
 *
 * This module maintains backward compatibility with OpenRouter API patterns
 * but routes all requests directly to Moonshot Kimi K2.5.
 *
 * No proxy server required - direct API calls to https://api.moonshot.ai/v1
 */

import {
  kimiChat,
  sendKimiMessage,
  continueKimiConversation,
  generateKimiCode,
  reviewKimiCode,
  checkKimiHealth,
  getKimiModels,
  type MoonshotMessage,
} from './moonshot';

// Re-export types for compatibility
export type ChatToolCall = Record<string, unknown>;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
}

export interface UsageStatistics {
  message: string;
}

// Default model - Kimi K2.5
const DEFAULT_MODEL = 'kimi-k2.5';

/**
 * Nova Agent-specific request options
 */
export interface NovaAgentChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Code generation request
 */
export interface CodeGenerationRequest {
  description: string;
  language?: string;
  context?: string;
  existingCode?: string;
}

/**
 * Code explanation request
 */
export interface CodeExplanationRequest {
  code: string;
  language?: string;
  focusAreas?: string[];
}

/**
 * OpenRouter client facade that uses Moonshot directly
 */
class MoonshotDirectClient {
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Convert ChatMessage to MoonshotMessage format
    const messages: MoonshotMessage[] = request.messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content ?? '',
    }));

    const response = await kimiChat({
      model: request.model ?? DEFAULT_MODEL,
      messages,
      max_tokens: request.max_tokens ?? 4096,
    });

    // Convert response to ChatCompletionResponse format
    return {
      id: response.id,
      choices: response.choices.map((choice) => ({
        message: {
          role: choice.message.role as 'assistant',
          content: choice.message.content,
        },
        finish_reason: choice.finish_reason,
      })),
      usage: response.usage,
    };
  }

  async getModels(): Promise<ModelInfo[]> {
    const models = await getKimiModels();
    return models.map((m) => ({
      id: m.id,
      name: m.id,
      context_length: m.context_length,
    }));
  }

  async getUsage(_period: string): Promise<UsageStatistics> {
    // Moonshot doesn't have a usage endpoint in the same way
    return { message: 'Usage tracking not available for Moonshot direct API' };
  }

  async healthCheck(): Promise<boolean> {
    return await checkKimiHealth();
  }
}

/**
 * Singleton client instance
 */
export const openRouterClient = new MoonshotDirectClient();

/**
 * Send a simple chat message to the LLM
 */
export async function sendChatMessage(
  content: string,
  options: NovaAgentChatOptions = {},
): Promise<string> {
  return await sendKimiMessage(content, {
    systemPrompt: options.systemPrompt,
    maxTokens: options.maxTokens,
    thinking: false,
  });
}

/**
 * Continue a multi-turn conversation
 */
export async function continueConversation(
  conversationHistory: ChatMessage[],
  newMessage: string,
  options: NovaAgentChatOptions = {},
): Promise<ChatCompletionResponse> {
  const moonshotHistory: MoonshotMessage[] = conversationHistory.map((msg) => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content ?? '',
  }));

  const response = await continueKimiConversation(moonshotHistory, newMessage, {
    maxTokens: options.maxTokens,
  });

  return {
    id: response.id,
    choices: response.choices.map((choice) => ({
      message: {
        role: choice.message.role as 'assistant',
        content: choice.message.content,
      },
      finish_reason: choice.finish_reason,
    })),
    usage: response.usage,
  };
}

/**
 * Generate code based on natural language description
 */
export async function generateCode(
  request: CodeGenerationRequest,
  _options: NovaAgentChatOptions = {},
): Promise<string> {
  return await generateKimiCode(
    request.description,
    request.language ?? 'typescript',
    request.context,
    request.existingCode,
  );
}

/**
 * Explain code in natural language
 */
export async function explainCode(
  request: CodeExplanationRequest,
  options: NovaAgentChatOptions = {},
): Promise<string> {
  const { code, language = 'typescript', focusAreas } = request;

  let prompt = `Explain the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

  if (focusAreas && focusAreas.length > 0) {
    prompt += `\n\nFocus on: ${focusAreas.join(', ')}`;
  }

  return await sendKimiMessage(prompt, {
    systemPrompt:
      options.systemPrompt ?? 'You are a technical educator. Explain code clearly and concisely.',
  });
}

/**
 * Refactor code with specific instructions
 */
export async function refactorCode(
  code: string,
  instructions: string,
  language: string = 'typescript',
  options: NovaAgentChatOptions = {},
): Promise<string> {
  const prompt = `Refactor the following ${language} code according to these instructions:\n\n${instructions}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide only the refactored code.`;

  return await sendKimiMessage(prompt, {
    systemPrompt:
      options.systemPrompt ??
      'You are a senior software engineer specializing in code refactoring. Apply best practices and clean code principles.',
    thinking: true,
  });
}

/**
 * Debug code and suggest fixes
 */
export async function debugCode(
  code: string,
  error: string,
  language: string = 'typescript',
  options: NovaAgentChatOptions = {},
): Promise<string> {
  const prompt = `Debug the following ${language} code that produces this error:\n\nError: ${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide analysis and suggested fixes.`;

  return await sendKimiMessage(prompt, {
    systemPrompt:
      options.systemPrompt ??
      'You are a debugging expert. Identify issues and provide clear, actionable solutions.',
    thinking: true,
  });
}

/**
 * Review code and provide feedback
 */
export async function reviewCode(
  code: string,
  language: string = 'typescript',
  _options: NovaAgentChatOptions = {},
): Promise<string> {
  return await reviewKimiCode(code, language);
}

/**
 * Get available LLM models
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
  return await openRouterClient.getModels();
}

/**
 * Get usage statistics
 */
export async function getUsageStatistics(
  period: string = '24h',
): Promise<UsageStatistics> {
  return await openRouterClient.getUsage(period);
}

/**
 * Check if the API is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return await openRouterClient.healthCheck();
}

/**
 * Create a custom chat request with full control
 */
export async function customChatRequest(
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  return await openRouterClient.chat(request);
}
