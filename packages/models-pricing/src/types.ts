export interface Model {
  id: string;
  name: string;
  provider: string;
  inputCost: number; // $ per 1M tokens
  outputCost: number; // $ per 1M tokens
  cachedInputCost?: number; // $ per 1M tokens
  contextWindow: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 1 | 2 | 3 | 4 | 5;
  bestFor: string;
  tier: 'free' | 'low' | 'medium' | 'high';
  recommended?: boolean;
}

export interface PricingTiers {
  inputCost: number;
  outputCost: number;
  cachedInputCost?: number;
}

export interface PriceHistory {
  id?: number;
  modelId: string;
  inputCost: number;
  outputCost: number;
  cachedInputCost?: number;
  timestamp: string;
}
