import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { getModels, getModel, updateModelPrice, addModel, openDb } from './index.js';

describe('Models and Pricing Database Service', () => {
  const testDbPath = 'D:\\databases\\test_models_pricing.db';

  beforeEach(() => {
    process.env.MODELS_PRICING_DB_PATH = testDbPath;
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch {
        // Ignore
      }
    }
  });

  afterEach(() => {
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch {
        // Ignore
      }
    }
  });

  it('should initialize and seed baseline models on first access', () => {
    const models = getModels();
    expect(models.length).toBeGreaterThan(0);
    
    // Check specific baseline model
    const gemini = getModel('google/gemini-3.5-flash');
    expect(gemini).not.toBeNull();
    expect(gemini?.name).toBe('Gemini 3.5 Flash');
    expect(gemini?.inputCost).toBe(1.50);
    expect(gemini?.cachedInputCost).toBe(0.15);
    expect(gemini?.recommended).toBe(true);
  });

  it('should get all models and retrieve one by ID', () => {
    const models = getModels();
    expect(models.length).toBeGreaterThan(0);

    const firstModel = models[0];
    expect(firstModel).toBeDefined();
    const fetched = getModel(firstModel!.id);
    expect(fetched).toEqual(firstModel);
  });

  it('should update pricing and keep history', () => {
    // Seed first
    getModels();

    const modelId = 'google/gemini-3.5-flash';
    const success = updateModelPrice(modelId, { inputCost: 0.1, outputCost: 0.4, cachedInputCost: 0.05 });
    expect(success).toBe(true);

    const updated = getModel(modelId);
    expect(updated?.inputCost).toBe(0.1);
    expect(updated?.outputCost).toBe(0.4);
    expect(updated?.cachedInputCost).toBe(0.05);

    // Verify history exists
    const db = openDb(testDbPath);
    const history = db.prepare('SELECT * FROM price_history WHERE modelId = ? ORDER BY id DESC').all(modelId);
    expect(history.length).toBeGreaterThan(0);
    expect((history[0] as any).inputCost).toBe(0.1);
    expect((history[0] as any).cachedInputCost).toBe(0.05);
  });

  it('should add/upsert a new model', () => {
    // Seed first
    getModels();

    const newModel = {
      id: 'custom-provider/custom-model',
      name: 'Custom Model',
      provider: 'Custom Provider',
      inputCost: 2.5,
      outputCost: 5.0,
      cachedInputCost: 0.5,
      contextWindow: '32K',
      speed: 'fast' as const,
      quality: 3 as const,
      bestFor: 'Testing custom model addition',
      tier: 'medium' as const,
      recommended: false,
    };

    addModel(newModel);

    const fetched = getModel(newModel.id);
    expect(fetched).toEqual({ ...newModel, recommended: false });
  });
});
