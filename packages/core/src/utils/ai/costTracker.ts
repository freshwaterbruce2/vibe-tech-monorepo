/**
 * Cost Tracker
 * Monitors and tracks LLM API costs
 */

export interface CostEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface DailyCostSummary {
  date: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  modelBreakdown: Record<string, { cost: number; requests: number }>;
}

export interface CostAlert {
  type: 'daily' | 'hourly' | 'request';
  threshold: number;
  current: number;
  exceeded: boolean;
  message: string;
}

/**
 * Model pricing (cost per 1M tokens in USD)
 * Updated as of 2026-02-23
 */
export const MODEL_PRICING = {
  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 },

  // OpenAI
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-4o': { input: 2.50, output: 10 },

  // Anthropic
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },

  // Google
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
} as const;

/**
 * Cost Tracker Service
 */
export class CostTracker {
  private entries: CostEntry[] = [];
  private readonly STORAGE_KEY = 'ai_cost_tracker';
  private readonly MAX_ENTRIES = 10000;

  // Alert thresholds (in USD)
  private dailyLimit: number = 100;
  private hourlyLimit: number = 10;
  private requestLimit: number = 1;

  constructor(options?: {
    dailyLimit?: number;
    hourlyLimit?: number;
    requestLimit?: number;
  }) {
    if (options) {
      if (options.dailyLimit) this.dailyLimit = options.dailyLimit;
      if (options.hourlyLimit) this.hourlyLimit = options.hourlyLimit;
      if (options.requestLimit) this.requestLimit = options.requestLimit;
    }

    this.loadFromStorage();
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.getModelPricing(model);
    if (!pricing) {
      console.warn(`[CostTracker] Unknown model pricing: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Get pricing for a model (handles partial matches)
   */
  private getModelPricing(model: string): { input: number; output: number } | null {
    // Exact match
    if (model in MODEL_PRICING) {
      return MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    }

    // Partial match (e.g., "openai/gpt-4-turbo" matches "gpt-4-turbo")
    for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
      if (model.includes(key)) {
        return pricing;
      }
    }

    return null;
  }

  /**
   * Log a request
   */
  logRequest(
    model: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, unknown>
  ): CostEntry {
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    const entry: CostEntry = {
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
      metadata,
    };

    this.entries.push(entry);

    // Limit entries to prevent memory bloat
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(-this.MAX_ENTRIES);
    }

    this.persist();
    return entry;
  }

  /**
   * Get today's cost
   */
  getTodaysCost(): number {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    return this.entries
      .filter((entry) => entry.timestamp >= todayStart)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }

  /**
   * Get last hour's cost
   */
  getLastHourCost(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.entries
      .filter((entry) => entry.timestamp >= oneHourAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }

  /**
   * Get cost for a date range
   */
  getCostForRange(startDate: Date, endDate: Date): number {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return this.entries
      .filter((entry) => entry.timestamp >= start && entry.timestamp <= end)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }

  /**
   * Get daily cost summary
   */
  getDailySummary(date: Date = new Date()): DailyCostSummary {
    const dayStart = new Date(date).setHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setHours(23, 59, 59, 999);

    const dayEntries = this.entries.filter(
      (entry) => entry.timestamp >= dayStart && entry.timestamp <= dayEnd
    );

    const modelBreakdown: Record<string, { cost: number; requests: number }> = {};

    let totalCost = 0;
    let totalTokens = 0;

    for (const entry of dayEntries) {
      totalCost += entry.cost;
      totalTokens += entry.inputTokens + entry.outputTokens;

      const breakdown = (modelBreakdown[entry.model] ??= {
        cost: 0,
        requests: 0,
      });

      breakdown.cost += entry.cost;
      breakdown.requests += 1;
    }

    const [summaryDate = date.toISOString()] = date.toISOString().split('T');

    return {
      date: summaryDate,
      totalCost,
      totalTokens,
      requestCount: dayEntries.length,
      modelBreakdown,
    };
  }

  /**
   * Check if cost limits are exceeded
   */
  checkAlerts(): CostAlert[] {
    const alerts: CostAlert[] = [];

    // Daily limit check
    const dailyCost = this.getTodaysCost();
    if (dailyCost >= this.dailyLimit) {
      alerts.push({
        type: 'daily',
        threshold: this.dailyLimit,
        current: dailyCost,
        exceeded: true,
        message: `Daily cost limit exceeded: $${dailyCost.toFixed(2)} / $${this.dailyLimit}`,
      });
    }

    // Hourly limit check
    const hourlyCost = this.getLastHourCost();
    if (hourlyCost >= this.hourlyLimit) {
      alerts.push({
        type: 'hourly',
        threshold: this.hourlyLimit,
        current: hourlyCost,
        exceeded: true,
        message: `Hourly cost limit exceeded: $${hourlyCost.toFixed(2)} / $${this.hourlyLimit}`,
      });
    }

    return alerts;
  }

  /**
   * Can make request without exceeding limits
   */
  canMakeRequest(estimatedCost: number): { allowed: boolean; reason?: string } {
    // Check request limit
    if (estimatedCost > this.requestLimit) {
      return {
        allowed: false,
        reason: `Request cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit ($${this.requestLimit})`,
      };
    }

    // Check daily limit
    const dailyCost = this.getTodaysCost();
    if (dailyCost + estimatedCost > this.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily cost limit would be exceeded: $${(dailyCost + estimatedCost).toFixed(2)} / $${this.dailyLimit}`,
      };
    }

    // Check hourly limit
    const hourlyCost = this.getLastHourCost();
    if (hourlyCost + estimatedCost > this.hourlyLimit) {
      return {
        allowed: false,
        reason: `Hourly cost limit would be exceeded: $${(hourlyCost + estimatedCost).toFixed(2)} / $${this.hourlyLimit}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get all entries
   */
  getEntries(): CostEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific model
   */
  getEntriesForModel(model: string): CostEntry[] {
    return this.entries.filter((entry) => entry.model.includes(model));
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.persist();
  }

  /**
   * Export to CSV
   */
  exportToCSV(): string {
    const header = 'Timestamp,Model,Input Tokens,Output Tokens,Cost USD\n';
    const rows = this.entries.map((entry) => {
      const date = new Date(entry.timestamp).toISOString();
      return `${date},${entry.model},${entry.inputTokens},${entry.outputTokens},${entry.cost.toFixed(6)}`;
    });

    return header + rows.join('\n');
  }

  /**
   * Persist to storage
   */
  private persist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.entries));
      }
    } catch (err) {
      console.error('[CostTracker] Failed to persist:', err);
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.entries = JSON.parse(stored) as CostEntry[];
        }
      }
    } catch (err) {
      console.error('[CostTracker] Failed to load from storage:', err);
      this.entries = [];
    }
  }
}

/**
 * Global cost tracker instance
 */
export const costTracker = new CostTracker();
