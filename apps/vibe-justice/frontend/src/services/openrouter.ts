// Inline types for OpenRouter client (avoiding external module dependency)
export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatChoice {
  index: number
  message: Message
  finish_reason: string | null
}

interface ChatUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ChatResponse {
  id: string
  choices: ChatChoice[]
  model: string
  usage?: ChatUsage
}

interface OpenRouterClientConfig {
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface ChatRequest {
  model: string
  messages: Message[]
  temperature?: number
  max_tokens?: number
}

/**
 * OpenRouter client for AI model access
 */
class OpenRouterClient {
  private baseUrl: string
  // Config stored for future use (timeout, retries, etc.)
  // @ts-expect-error Config reserved for future timeout/retry implementation
  private _config: OpenRouterClientConfig

  constructor(baseUrl: string, config: OpenRouterClientConfig = {}) {
    this.baseUrl = baseUrl
    this._config = config
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/openrouter/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    return response.json()
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/models`)
    if (!response.ok) return []
    const data = await response.json()
    return data.models || []
  }

  async getUsage(_period: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/api/v1/usage`)
    if (!response.ok) return null
    return response.json()
  }
}

// Create configured OpenRouter client instance
export const openRouterClient = new OpenRouterClient('http://localhost:3001', {
  timeout: 60000, // 60 seconds for legal document analysis
  retries: 3,
  retryDelay: 2000,
})

// Legal AI domain-specific models (Updated: January 2026)
// Optimized for PERSONAL PROJECT: Free models primary, cost-efficient paid fallbacks
export const LEGAL_MODELS = {
  // ===== FREE MODELS (Use these first!) =====

  // Moonshot Kimi: Primary model for legal analysis
  ANALYSIS: 'moonshotai/kimi-k2.5',

  // Moonshot Kimi: Advanced reasoning
  REASONING: 'moonshotai/kimi-k2.5',

  // Moonshot Kimi: General-purpose legal work
  GENERAL: 'moonshotai/kimi-k2.5',

  // Moonshot Kimi: Alternative reasoning model for fallback
  SUMMARIZATION: 'moonshotai/kimi-k2.5',

  // Moonshot Kimi: Interactive legal chat
  CHAT: 'moonshotai/kimi-k2.5',

  // ===== COST-EFFICIENT PAID FALLBACKS =====

  // Claude Haiku 4 (~$0.25/$1.25 per 1M tokens): Best paid option
  // Use when you need guaranteed Claude quality
  ANALYSIS_PAID: 'anthropic/claude-haiku-4',

  // Google Gemini Pro 1.5 (~$1.25/$5 per 1M tokens): Document analysis
  // Good balance of cost and quality for long documents
  ANALYSIS_PREMIUM: 'google/gemini-pro-1.5',

  // Claude Sonnet 3.5 ($3/$15 per 1M tokens): Critical cases only
  // Use sparingly for highest quality needs
  CRITICAL: 'anthropic/claude-sonnet-3.5',
} as const

// Legal AI Helper Functions

// Model tier selection for cost control
export type ModelTier = 'free' | 'paid' | 'premium'

let currentTier: ModelTier = 'free' // Default to free models

/**
 * Set the model tier (free/paid/premium)
 * Controls which models are used across all functions
 */
export function setModelTier(tier: ModelTier) {
  currentTier = tier
  // console.log(`[Vibe-Justice] Model tier set to: ${tier}`);
}

/**
 * Get current model tier
 */
export function getModelTier(): ModelTier {
  return currentTier
}

/**
 * Get model for analysis based on current tier
 */
function getAnalysisModel(): string {
  switch (currentTier) {
    case 'free':
      return LEGAL_MODELS.ANALYSIS // DeepSeek V3 - FREE
    case 'paid':
      return LEGAL_MODELS.ANALYSIS_PAID // Claude Haiku 4 - $0.25/$1.25
    case 'premium':
      return LEGAL_MODELS.ANALYSIS_PREMIUM // Gemini Pro 1.5 - $1.25/$5
    default:
      return LEGAL_MODELS.ANALYSIS
  }
}

/**
 * Analyze legal evidence or documents
 * Uses DeepSeek V3 (FREE) by default, or paid models based on tier setting
 *
 * @param documentText - The legal document to analyze
 * @param context - Additional context about the case
 * @param modelOverride - Optional model override for advanced cases
 */
export async function analyzeLegalDocument(
  documentText: string,
  context?: string,
  modelOverride?: string
): Promise<string> {
  const systemPrompt = `You are an expert legal analyst. Analyze the provided document for:
- Key legal issues and facts
- Relevant case law or statutes
- Potential arguments and counterarguments
- Credibility assessments
${context ? `\nAdditional context: ${context}` : ''}`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: documentText },
  ]

  const response = await openRouterClient.chat({
    model: modelOverride || getAnalysisModel(),
    messages,
    temperature: 0.3, // Lower temperature for analytical tasks
    max_tokens: 8000,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Perform legal reasoning on a case
 * Uses DeepSeek R1 (FREE) for chain-of-thought reasoning - on par with OpenAI o1!
 *
 * @param caseDescription - Description of the case
 * @param question - Specific question to reason about
 * @param usePremium - Use Claude Sonnet 3.5 for critical cases (costs $3/$15 per 1M tokens)
 */
export async function performLegalReasoning(
  caseDescription: string,
  question: string,
  usePremium: boolean = false
): Promise<string> {
  const systemPrompt = `You are a legal reasoning expert. Use chain-of-thought reasoning to:
1. Identify relevant legal principles
2. Apply facts to law
3. Consider alternative interpretations
4. Provide a well-reasoned conclusion`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Case: ${caseDescription}\n\nQuestion: ${question}`,
    },
  ]

  const response = await openRouterClient.chat({
    model: usePremium ? LEGAL_MODELS.CRITICAL : LEGAL_MODELS.REASONING, // DeepSeek R1 is FREE!
    messages,
    temperature: 0.7, // Higher temperature for reasoning
    max_tokens: usePremium ? 16000 : 12000, // DeepSeek R1 uses ~23K for complex reasoning
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Summarize case files or documents
 */
export async function summarizeCaseDocument(
  documentText: string,
  maxLength: number = 500
): Promise<string> {
  const systemPrompt = `You are a legal document summarizer. Create concise summaries that preserve:
- Key facts and dates
- Legal claims or charges
- Important evidence
- Current status
Maximum length: ${maxLength} words.`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: documentText },
  ]

  const response = await openRouterClient.chat({
    model: LEGAL_MODELS.SUMMARIZATION,
    messages,
    temperature: 0.2, // Very low temperature for summaries
    max_tokens: 2000,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * General legal chat functionality
 */
export async function legalChat(
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<ChatResponse> {
  const systemMessage: Message = {
    role: 'system',
    content: `You are a legal AI assistant for the Vibe Justice system. You help with:
- Case analysis and investigation
- Legal research and precedents
- Evidence evaluation
- Strategic planning
Always provide clear, actionable insights based on legal principles.`,
  }

  const messages: Message[] = [
    systemMessage,
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  return openRouterClient.chat({
    model: LEGAL_MODELS.CHAT,
    messages,
    temperature: 0.7,
    max_tokens: 4000,
  })
}

/**
 * Extract key information from interrogation transcripts
 */
export async function analyzeInterrogation(
  transcript: string,
  focus: 'inconsistencies' | 'timeline' | 'credibility' | 'all' = 'all'
): Promise<string> {
  const focusPrompts = {
    inconsistencies: 'Identify contradictions and inconsistent statements.',
    timeline: 'Extract and organize all temporal information into a timeline.',
    credibility:
      'Assess the credibility of statements based on consistency, detail, and corroboration.',
    all: 'Provide a comprehensive analysis including timeline, inconsistencies, and credibility assessment.',
  }

  const systemPrompt = `You are an expert in interrogation analysis. ${focusPrompts[focus]}`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: transcript },
  ]

  const response = await openRouterClient.chat({
    model: LEGAL_MODELS.ANALYSIS,
    messages,
    temperature: 0.3,
    max_tokens: 4000,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Generate legal strategy recommendations
 */
export async function generateStrategy(caseDetails: string, objective: string): Promise<string> {
  const systemPrompt = `You are a legal strategist. Generate actionable legal strategies that:
1. Align with the stated objective
2. Consider available evidence and facts
3. Anticipate opposing arguments
4. Suggest next investigative steps
5. Identify potential risks and mitigation`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Case Details:\n${caseDetails}\n\nObjective:\n${objective}`,
    },
  ]

  const response = await openRouterClient.chat({
    model: LEGAL_MODELS.REASONING,
    messages,
    temperature: 0.8, // Higher creativity for strategy generation
    max_tokens: 6000,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Health check for OpenRouter service
 */
export async function checkOpenRouterHealth(): Promise<boolean> {
  try {
    return await openRouterClient.healthCheck()
  } catch (error) {
    console.error('OpenRouter health check failed:', error)
    return false
  }
}

/**
 * Get available models from OpenRouter
 */
export async function getAvailableModels() {
  try {
    return await openRouterClient.getModels()
  } catch (error) {
    console.error('Failed to fetch models:', error)
    return []
  }
}

/**
 * Get usage statistics
 */
export async function getUsageStats(period: string = '24h') {
  try {
    return await openRouterClient.getUsage(period)
  } catch (error) {
    console.error('Failed to fetch usage stats:', error)
    return null
  }
}
