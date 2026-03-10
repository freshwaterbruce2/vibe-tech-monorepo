/**
 * Model Selector Types
 * Provides model configuration for AI completion
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxTokens: number;
  costPer1kTokens: number;
  capabilities: string[];
  isDefault?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface ModelSelection {
  model: ModelConfig;
  reason: string;
  confidence: number;
}

export class ModelSelector {
  private models: ModelConfig[] = [];
  
  addModel(config: ModelConfig): void {
    this.models.push(config);
  }
  
  getModel(id: string): ModelConfig | undefined {
    return this.models.find(m => m.id === id);
  }
  
  listModels(): ModelConfig[] {
    return [...this.models];
  }
  
  selectBestModel(requirements: { contextSize?: number; capabilities?: string[] }): ModelConfig | null {
    const filtered = this.models.filter(m => {
      if (requirements.contextSize && m.contextWindow < requirements.contextSize) {
        return false;
      }
      if (requirements.capabilities) {
        return requirements.capabilities.every(c => m.capabilities.includes(c));
      }
      return true;
    });
    
    return filtered.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens)[0] ?? null;
  }
}
