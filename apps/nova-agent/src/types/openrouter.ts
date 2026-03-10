/**
 * Type definitions for OpenRouter service in Nova Agent
 *
 * These types extend the base OpenRouter client types with Nova-specific functionality
 */

import type {
	ChatCompletionRequest,
	ChatCompletionResponse,
	ChatMessage,
	ModelInfo,
} from "@vibetech/openrouter-client";

/**
 * Re-export base types from openrouter-client for convenience
 */
export type {
	ChatMessage,
	ChatCompletionRequest,
	ChatCompletionResponse,
	ModelInfo,
};

// Alias for backward compatibility
export type Message = ChatMessage;
export type ChatRequest = ChatCompletionRequest;
export type ChatResponse = ChatCompletionResponse;
export type Model = ModelInfo;

/**
 * Nova Agent-specific chat options
 */
export interface NovaAgentChatOptions {
	/** LLM model to use (defaults to claude-3.5-sonnet) */
	model?: string;

	/** Temperature for response generation (0-2, default 0.7) */
	temperature?: number;

	/** Maximum tokens in response */
	maxTokens?: number;

	/** System prompt to set context */
	systemPrompt?: string;

	/** Enable streaming responses */
	stream?: boolean;
}

/**
 * Request for code generation
 */
export interface CodeGenerationRequest {
	/** Natural language description of code to generate */
	description: string;

	/** Programming language (defaults to 'typescript') */
	language?: string;

	/** Additional context about the project or requirements */
	context?: string;

	/** Existing code to build upon or reference */
	existingCode?: string;
}

/**
 * Request for code explanation
 */
export interface CodeExplanationRequest {
	/** Code to explain */
	code: string;

	/** Programming language of the code */
	language?: string;

	/** Specific areas to focus explanation on */
	focusAreas?: string[];
}

/**
 * Request for code refactoring
 */
export interface CodeRefactorRequest {
	/** Code to refactor */
	code: string;

	/** Specific refactoring instructions */
	instructions: string;

	/** Programming language */
	language?: string;
}

/**
 * Request for code debugging
 */
export interface CodeDebugRequest {
	/** Code with issues */
	code: string;

	/** Error message or description of the issue */
	error: string;

	/** Programming language */
	language?: string;
}

/**
 * Request for code review
 */
export interface CodeReviewRequest {
	/** Code to review */
	code: string;

	/** Programming language */
	language?: string;

	/** Specific aspects to focus on (quality, security, performance, etc.) */
	focusAreas?: string[];
}

/**
 * Conversation context for multi-turn interactions
 */
export interface ConversationContext {
	/** Conversation history */
	messages: ChatMessage[];

	/** Conversation metadata */
	metadata?: {
		/** Conversation ID */
		id?: string;

		/** Project context */
		projectId?: string;

		/** User ID */
		userId?: string;

		/** Conversation topic */
		topic?: string;

		/** Additional tags */
		tags?: string[];
	};
}

/**
 * Response from code-related operations
 */
export interface CodeOperationResponse {
	/** Generated or modified code */
	code: string;

	/** Explanation or additional context */
	explanation?: string;

	/** Suggested next steps */
	suggestions?: string[];

	/** Warnings or caveats */
	warnings?: string[];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
	/** Service health status */
	healthy: boolean;

	/** Response time in milliseconds */
	responseTime?: number;

	/** Error message if unhealthy */
	error?: string;
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
	/** Supports code generation */
	codeGeneration: boolean;

	/** Supports code explanation */
	codeExplanation: boolean;

	/** Supports multi-turn conversations */
	multiTurn: boolean;

	/** Supports streaming */
	streaming: boolean;

	/** Maximum context length */
	maxContextLength: number;

	/** Specialized capabilities */
	specializations?: string[];
}

/**
 * Service configuration
 */
export interface OpenRouterServiceConfig {
	/** Base URL for OpenRouter proxy */
	baseURL: string;

	/** Request timeout in milliseconds */
	timeout: number;

	/** Number of retries on failure */
	retries: number;

	/** Delay between retries in milliseconds */
	retryDelay: number;

	/** Default model to use */
	defaultModel: string;

	/** Default temperature */
	defaultTemperature: number;

	/** Default max tokens */
	defaultMaxTokens: number;
}

/**
 * Error response from OpenRouter service
 */
export interface OpenRouterServiceError {
	/** Error message */
	message: string;

	/** HTTP status code (if applicable) */
	status?: number;

	/** Error code */
	code?: string;

	/** Additional error details */
	details?: any;

	/** Stack trace (in development) */
	stack?: string;
}
