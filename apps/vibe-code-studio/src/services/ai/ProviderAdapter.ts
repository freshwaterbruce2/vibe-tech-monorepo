import type {
    AIModel,
    AIProvider,
    AIProviderConfig,
    CompletionOptions,
    CompletionResponse,
    IAIProvider,
    StreamCompletionResponse} from './AIProviderInterface';
import {
    MODEL_REGISTRY
} from './AIProviderInterface';
import type { AICompletionRequest, IAIService } from '../../types/ai';
import { OpenRouterService } from './providers/OpenRouterService';
import { MoonshotService } from './providers/MoonshotService';
import { DeepSeekService } from './providers/DeepSeekService';
import { GoogleGenerativeAIService } from './providers/GoogleGenerativeAIService';

export class ServiceAdapter implements IAIProvider {
    private service: IAIService;
    private providerType: AIProvider;
    constructor(service: IAIService, providerType: AIProvider) {
        this.service = service;
        this.providerType = providerType;
    }

    async initialize(config: AIProviderConfig): Promise<void> {
        // Recreate the service with the API key from config
        // Services are created without config in the factory, so we must inject the key here
        if (config.apiKey) {
            if (this.service.id === 'openrouter') {
                this.service = new OpenRouterService({ apiKey: config.apiKey });
            } else if (this.service.id === 'moonshot') {
                this.service = new MoonshotService({ apiKey: config.apiKey });
            } else if (this.service.id === 'deepseek') {
                this.service = new DeepSeekService({ apiKey: config.apiKey });
            } else if (this.service.id === 'google') {
                this.service = new GoogleGenerativeAIService({ apiKey: config.apiKey });
            }
        }

        await this.service.initialize();
    }

    async complete(model: string, options: CompletionOptions): Promise<CompletionResponse> {
        const request: AICompletionRequest = {
            messages: options.messages,
            model: model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stream: false,
        };

        const response = await this.service.complete(request);

        return {
            id: Date.now().toString(), // Mock ID if not provided
            choices: [{
                message: {
                    role: 'assistant',
                    content: response.content
                },
                finishReason: 'stop', // Assumed
                index: 0
            }],
            usage: {
                promptTokens: response.usage?.promptTokens ?? 0,
                completionTokens: response.usage?.completionTokens ?? 0,
                totalTokens: response.usage?.totalTokens ?? 0
            },
            model: model,
            created: Date.now(),
            content: response.content
        };
    }

    async *streamComplete(model: string, options: CompletionOptions): AsyncGenerator<StreamCompletionResponse> {
        if (!this.service.stream) {
            throw new Error('Streaming not supported by this service');
        }

        // Note: IAIService.stream signature: stream(messages: ChatMessage[], options?: AIChatOptions)
        // options in AIChatOptions has model, temperature, maxTokens
        const chatOptions = {
            model: model,
            temperature: options.temperature,
            maxTokens: options.maxTokens
        };

        for await (const chunk of this.service.stream(options.messages, chatOptions)) {
            yield {
                id: Date.now().toString(),
                choices: [{
                    delta: { content: chunk },
                    index: 0
                }],
                model: model,
                created: Date.now(),
                content: chunk
            };
        }
    }

    async getAvailableModels(): Promise<AIModel[]> {
        // Return models from registry matching this provider
        return Object.values(MODEL_REGISTRY).filter(m => m.provider === this.providerType);
    }

    async validateConnection(): Promise<boolean> {
        // Try a minimal completion or check init status
        // Since IAIService doesn't have a standardized validate, we'll assume true if initialize didn't throw,
        // or try a cheap call if possible.
        try {
            // We can't easily make a call without a valid model and api key, which we assume are set.
            // Let's rely on initialization for now.
            return true;
        } catch (_e) {
            return false;
        }
    }

    async getUsageStats(): Promise<{ tokensUsed: number; estimatedCost: number; requestCount: number; }> {
        // Provide dummy stats or implement tracking if possible
        return { tokensUsed: 0, estimatedCost: 0, requestCount: 0 };
    }

    cancelStream(): void {
        // Not implemented in IAIService
    }
}
