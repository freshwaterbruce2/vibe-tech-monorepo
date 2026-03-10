import { IPCClient } from './IPCClient.js';
import { VectorStore } from './services/VectorStore.js';
import { EmbeddingService } from './services/EmbeddingService.js';
import { IPCMessageType, type CommandResultPayload } from '@vibetech/shared-ipc';

const vectorStore = new VectorStore();
const embeddingService = new EmbeddingService();
const SOURCE = 'vibe' as const;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📦 Closing D:/ drive database...');
  vectorStore.close();
  process.exit(0);
});

const client = new IPCClient(SOURCE, 'ws://localhost:5004', async (message) => {
  if (message.type !== IPCMessageType.COMMAND_EXECUTE) {
    return;
  }

  const payload = message.payload;
  if (payload.command !== 'brainscan:search') {
    return;
  }

  try {
    console.log(`Executing brainscan:search for query: ${payload.text.substring(0, 50)}...`);
    const text = payload.text;
    const metadata = message.metadata ?? {};

    if (!text) {
      throw new Error('No text provided for brainscan');
    }

    const embedding = await embeddingService.generate(text);
    const searchResults = vectorStore.search(embedding, 3);
    const hydrated = searchResults
      .map((result) => ({
        result,
        pattern: vectorStore.getPatternById(result.strategy_id),
      }))
      .filter((entry) => entry.pattern !== undefined);
    const finalPatterns = hydrated.map((entry) => entry.pattern);
    const scores = hydrated.map((entry) => ({
      score: entry.result.score,
      distance: entry.result.distance,
    }));

    const responsePayload: CommandResultPayload = {
      commandId: payload.commandId,
      success: true,
      result: {
        patterns: finalPatterns,
        scores,
        thought_signature:
          typeof metadata.thought_signature === 'string'
            ? metadata.thought_signature
            : undefined,
      },
    };

    client.send({
      type: IPCMessageType.COMMAND_RESULT,
      payload: responsePayload,
      timestamp: Date.now(),
      messageId: `res-${Date.now()}`,
      source: SOURCE,
      version: '1.0.0',
    });
  } catch (error) {
    console.error('Error executing brainscan:search:', error);

    const errorPayload: CommandResultPayload = {
      commandId: payload.commandId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    client.send({
      type: IPCMessageType.COMMAND_RESULT,
      payload: errorPayload,
      timestamp: Date.now(),
      messageId: `err-${Date.now()}`,
      source: SOURCE,
      version: '1.0.0',
    });
  }
});

console.log('Starting Backend Brain Service...');
client.connect();
