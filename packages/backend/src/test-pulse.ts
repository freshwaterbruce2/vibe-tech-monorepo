import { EmbeddingService } from './services/EmbeddingService.js';
import { VectorStore } from './services/VectorStore.js';

async function runPulse() {
  console.log('--- SYSTEM PULSE STARTED ---');

  try {
    // 1. Initialize Services
    console.log('Initializing Embedding Service...');
    const embeddingService = new EmbeddingService();
    await embeddingService.init();
    console.log('Embedding Service: READY');

    console.log('Initializing Vector Store...');
    const vectorStore = new VectorStore();
    console.log('Vector Store: READY');

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
    console.log(`Inserted test pattern with ID: ${id}`);

    // 3. Perform Search (The Test Case)
    const query = 'Ensure all database calls use WAL mode for high concurrency.';
    console.log(`\nQuerying: "${query}"`);

    const queryEmbedding = await embeddingService.generate(query);
    const results = vectorStore.search(queryEmbedding, 3);

    console.log('\n--- SEARCH RESULTS ---');
    if (results.length === 0) {
      console.warn('No matches found.');
    } else {
      for (const result of results) {
        const pattern = vectorStore.getPatternById(result.strategy_id);
        if (pattern) {
          console.log(`[Score: ${result.score.toFixed(4)}] ID: ${pattern.id}`);
          console.log(`Rule: ${pattern.logic_rule}`);
          console.log(`Tags: ${pattern.tags.join(', ')}`);
          console.log('---');
        }
      }
    }

    console.log('\n--- SYSTEM PULSE COMPLETED: GREEN ---');
  } catch (error) {
    console.error('\n!!! SYSTEM PULSE FAILED !!!');
    console.error(error);
    process.exit(1);
  }
}

runPulse().catch((error) => {
  console.error('Fatal error running pulse:', error);
  process.exit(1);
});
