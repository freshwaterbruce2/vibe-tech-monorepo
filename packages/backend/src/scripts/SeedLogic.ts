import { VectorStore } from '../services/VectorStore.js';
import { EmbeddingService } from '../services/EmbeddingService.js';
import { createLogger } from '@vibetech/logger';

const logger = createLogger('SeedLogic');

const CORE_RULES = [
  "Use WAL mode for all SQLite connections on the D: drive to enable concurrency.",
  "Every Gemini 3 tool call must preserve the thought_signature to prevent 400 errors.",
  "UI components must live in apps/vibe-justice, logic must live in packages/shared-logic.",
  "Semantic searches must use sqlite-vec (vec0) for SIMD-accelerated performance."
];

async function seed() {
  const store = new VectorStore();
  const embedder = new EmbeddingService();
  await embedder.init();

  logger.info('Seeding Justice Rules to D:/vibe-tech/...');

  for (const rule of CORE_RULES) {
    const vector = await embedder.generate(rule);
    
    // Create a full pattern object
    const pattern = {
      logic_rule: rule,
      pattern_data: { type: 'core_rule', source: 'seed_script' },
      success_rate: 1.0,
      tags: ['core', 'architecture', '2025']
    };

    const id = await store.addPattern(pattern, vector); 
    logger.info(`Indexed (ID: ${id}): "${rule.substring(0, 30)}..."`);
  }
}

seed().catch((error) => {
  logger.error('Fatal error running seed:', undefined, error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
