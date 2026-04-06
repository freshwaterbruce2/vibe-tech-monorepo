import { EmbeddingService } from './services/EmbeddingService.js';
import { VectorStore } from './services/VectorStore.js';
import { createLogger } from '@vibetech/logger';

const logger = createLogger('test-pulse');

async function runPulse() {
  logger.info('--- SYSTEM PULSE STARTED ---');

  try {
    // 1. Initialize Services
    logger.info('Initializing Embedding Service...');
    const embeddingService = new EmbeddingService();
    await embeddingService.init();
    logger.info('Embedding Service: READY');

    logger.info('Initializing Vector Store...');
    const vectorStore = new VectorStore();
    logger.info('Vector Store: READY');

    // 2. Add Test Logic Pattern (if needed, just to ensure we have data to find)
    const testPattern = {
      logic_rule: 'Use WAL mode for high concurrency in SQLite',
      pattern_data: { type: 'optimization', database: 'sqlite', mode: 'wal' },
      success_rate: 0.99,
      tags: ['sqlite', 'performance', 'wal'],
    };

    // Generate embedding for the pattern itself to store it
    const patternEmbedding = await embeddingService.generate(testPattern.logic_rule);

    // We'll try to add it. If it's a new DB it will be added.
    // If we want to be pure, we might just search, but to be sure we get a hit:
    const id = await vectorStore.addPattern(testPattern, patternEmbedding);
    logger.info(`Inserted test pattern with ID: ${id}`);

    // 3. Perform Search (The Test Case)
    const query = 'Ensure all database calls use WAL mode for high concurrency.';
    logger.info(`Querying: "${query}"`);

    const queryEmbedding = await embeddingService.generate(query);
    const results = vectorStore.search(queryEmbedding, 3);

    logger.info('--- SEARCH RESULTS ---');
    if (results.length === 0) {
      logger.warn('No matches found.');
    } else {
      for (const result of results) {
        const pattern = vectorStore.getPatternById(result.strategy_id);
        if (pattern) {
          logger.info(`[Score: ${result.score.toFixed(4)}] ID: ${pattern.id}`);
          logger.info(`Rule: ${pattern.logic_rule}`);
          logger.info(`Tags: ${pattern.tags.join(', ')}`);
          logger.debug('---');
        }
      }
    }

    logger.info('--- SYSTEM PULSE COMPLETED: GREEN ---');
  } catch (error) {
    logger.error('!!! SYSTEM PULSE FAILED !!!', undefined, error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

runPulse().catch((error) => {
  logger.error('Fatal error running pulse:', undefined, error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
