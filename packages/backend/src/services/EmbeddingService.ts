import { env, pipeline } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

// Strategy: Zero-Cloud dependency. All model data lives on the D: drive
env.cacheDir = 'D:/vibe-tech/ai-models';
env.allowRemoteModels = true; // Set to false once the model is first downloaded

export class EmbeddingService {
  private extractor: FeatureExtractionPipeline | undefined;

  async init() {
    // Initializes the local 384-dimensional embedding model
    this.extractor ??= await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async generate(text: string): Promise<Float32Array> {
    if (!this.extractor) await this.init();
    const extractor = this.extractor as FeatureExtractionPipeline;

    const output = await extractor(text, {
      pooling: 'mean', 
      normalize: true 
    });

    // sqlite-vec expects raw Float32 data
    return new Float32Array(output.data as ArrayLike<number>);
  }
}