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
            // Forward the caller's cancel signal so an aborted request actually
            // tears down the underlying fetch (e.g. proxy / direct provider calls).
            signal: options.signal,
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

    async *streamComplete(
        model: string,
        options: CompletionOptions
    ): AsyncGenerator<StreamCompletionResponse> {
        if (!this.service.stream) {
            throw new Error('Streaming not supported by this service');
        }

        // IAIService.stream signature: stream(messages, options?) where options
        // (AIChatOptions) carries model, temperature, maxTokens.
        const chatOptions = {
            model: model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            signal: options.signal,
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
        // IAIService has no standardized validate, but some services (e.g. the
        // backend proxy) expose a real reachability check. Delegate to it when
        // present so "available" reflects reality; otherwise assume reachable
        // (direct services surface real errors at call time).
        const svc = this.service as Partial<{ validateConnection: () => Promise<boolean> }>;
        if (typeof svc.validateConnection === 'function') {
            try {
                return await svc.validateConnection();
            } catch (_e) {
                return false;
            }
        }
        return true;
    }

    async getUsageStats(): Promise<{
        tokensUsed: number;
        estimatedCost: number;
        requestCount: number;
    }> {
        // Provide dummy stats or implement tracking if possible
        return { tokensUsed: 0, estimatedCost: 0, requestCount: 0 };
    }

    cancelStream(): void {
        // Delegate to the wrapped service when it supports cancellation (e.g. the
        // backend proxy aborts its active AbortControllers). Mirrors the
        // validateConnection delegation above so factory cleanup() actually tears
        // down in-flight streams instead of silently no-op'ing.
        const svc = this.service as Partial<{ cancelStream: () => void }>;
        svc.cancelStream?.();
    }
}
