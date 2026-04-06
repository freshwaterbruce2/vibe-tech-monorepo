/**
 * VectorStore Diagnostic Script (Standalone - No Electron Dependencies)
 *
 * Verifies:
 * 1. all-MiniLM-L6-v2 model initialization from D:\vibe-tech\ai-models
 * 2. Successfully generates 384-dimensional embedding for test string
 * 3. Database initialization (without full VectorStore due to Electron dependency)
 */

import { env, pipeline } from '@xenova/transformers';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@vibetech/logger';

const logger = createLogger('vectorstore-diagnostic');

const EXPECTED_DIMENSION = 384;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const MODEL_CACHE_DIR = 'D:/vibe-tech/ai-models';
const TEST_STRING = 'This is a test string for embedding generation.';

function toFloat32Array(data: unknown): Float32Array {
  if (data instanceof Float32Array) {
    return data;
  }
  if (Array.isArray(data)) {
    return new Float32Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    return new Float32Array(bytes.buffer.slice(0));
  }
  if (data instanceof ArrayBuffer) {
    return new Float32Array(data);
  }
  throw new Error('Unsupported embedding output type');
}

async function runDiagnostic() {
  logger.info('=================================================');
  logger.info('  VectorStore & Embedding Model Diagnostic');
  logger.info('  (Standalone - No Electron Dependencies)');
  logger.info('=================================================');

  const results = {
    modelPathExists: false,
    envConfigured: false,
    modelInitialized: false,
    embeddingGenerated: false,
    dimensionCorrect: false,
    databaseInitialized: false,
    errors: [] as string[],
  };

  try {
    // ========================================
    // Step 1: Verify Model Cache Directory
    // ========================================
    logger.info(`[1/6] Verifying model cache directory...`);
    logger.debug(`      Path: ${MODEL_CACHE_DIR}`);

    if (fs.existsSync(MODEL_CACHE_DIR)) {
      results.modelPathExists = true;
      logger.info(`      Directory exists`);

      // List contents to verify model files
      const modelDir = path.join(MODEL_CACHE_DIR, 'models--Xenova--all-MiniLM-L6-v2');
      if (fs.existsSync(modelDir)) {
        logger.info(`      Model directory found: ${modelDir}`);
        try {
          const files = fs.readdirSync(modelDir, { recursive: true });
          logger.info(`      Contains ${Array.isArray(files) ? files.length : 'multiple'} files`);
        } catch {
          logger.info(`      Model directory exists (unable to count files)`);
        }
      } else {
        logger.warn(`      Model directory not found (will download on first use)`);
      }
    } else {
      results.errors.push(`Model cache directory does not exist: ${MODEL_CACHE_DIR}`);
      logger.warn(`      Directory does not exist - creating it...`);
      try {
        fs.mkdirSync(MODEL_CACHE_DIR, { recursive: true });
        logger.info(`      Created directory: ${MODEL_CACHE_DIR}`);
        results.modelPathExists = true;
      } catch (e) {
        logger.error(`      Failed to create directory`, { error: String(e) });
      }
    }

    // ========================================
    // Step 2: Configure Environment
    // ========================================
    logger.info(`[2/6] Configuring environment...`);

    // Configure the cache directory (same as EmbeddingService)
    env.cacheDir = MODEL_CACHE_DIR;
    env.allowRemoteModels = true; // Allow download if needed

    logger.debug(`      Cache Dir: ${env.cacheDir}`);
    logger.debug(`      Allow Remote Models: ${env.allowRemoteModels}`);
    results.envConfigured = true;
    logger.info(`      Environment configured`);

    // ========================================
    // Step 3: Initialize Embedding Model
    // ========================================
    logger.info(`[3/6] Initializing embedding model...`);
    logger.debug(`      Model: ${MODEL_NAME}`);
    logger.info(`      Note: First run may download model (~90MB)`);

    const startTime = Date.now();
    const extractor = await pipeline('feature-extraction', MODEL_NAME);
    const initTime = Date.now() - startTime;

    results.modelInitialized = true;
    logger.info(`      Model initialized successfully (${initTime}ms)`);

    // ========================================
    // Step 4: Generate Test Embedding
    // ========================================
    logger.info(`[4/6] Generating test embedding...`);
    logger.debug(`      Test String: "${TEST_STRING}"`);

    const output = await extractor(TEST_STRING, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = toFloat32Array(output.data);
    results.embeddingGenerated = true;
    logger.info(`      Embedding generated successfully`);

    // Verify dimensions
    const actualDimension = embedding.length;
    logger.debug(`      Dimension: ${actualDimension}`);

    if (actualDimension === EXPECTED_DIMENSION) {
      results.dimensionCorrect = true;
      logger.info(`      Dimension matches expected (${EXPECTED_DIMENSION})`);
    } else {
      results.errors.push(
        `Dimension mismatch. Expected: ${EXPECTED_DIMENSION}, Got: ${actualDimension}`,
      );
      logger.warn(
        `      Dimension mismatch! Expected ${EXPECTED_DIMENSION}, got ${actualDimension}`,
      );
    }

    // Display sample values
    logger.debug(
      `      Sample values: [${Array.from(embedding.slice(0, 5))
        .map((v) => v.toFixed(4))
        .join(', ')}...]`,
    );
    logger.debug(`      Data type: ${embedding.constructor.name}`);

    // Calculate magnitude to verify normalization
    const magnitude = Math.sqrt(Array.from(embedding).reduce((sum, val) => sum + val * val, 0));
    logger.debug(`      Vector magnitude: ${magnitude.toFixed(6)} (should be ~1.0 for normalized)`);

    // ========================================
    // Step 5: Verify Model Files
    // ========================================
    logger.info(`[5/6] Verifying downloaded model files...`);
    const modelDir = path.join(MODEL_CACHE_DIR, 'models--Xenova--all-MiniLM-L6-v2');

    if (fs.existsSync(modelDir)) {
      logger.info(`      Model persisted to: ${modelDir}`);

      // Check for key files
      const keyFiles = ['config.json', 'tokenizer.json', 'onnx'];
      for (const _file of keyFiles) {
        const filePath = path.join(modelDir, 'snapshots');
        if (fs.existsSync(filePath)) {
          logger.info(`      Found snapshots directory`);
          break;
        }
      }
    }

    // ========================================
    // Step 6: Test Database Initialization
    // ========================================
    logger.info(`[6/6] Testing database initialization...`);

    const testDbDir = path.join(MODEL_CACHE_DIR, 'vector-store');
    const testDbPath = path.join(testDbDir, 'diagnostic-test.db');

    logger.debug(`      Database Path: ${testDbPath}`);

    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
      logger.info(`      Created database directory`);
    }

    const db = new Database(testDbPath);
    logger.info(`      Database connection established`);

    // Create test schema (same as VectorStore)
    db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        content TEXT,
        metadata JSON,
        vector BLOB
      );
      CREATE INDEX IF NOT EXISTS idx_metadata ON embeddings(metadata);
    `);
    logger.info(`      Schema created successfully`);

    // Test insert
    const testId = 'diagnostic-test-' + Date.now();
    const stmt = db.prepare('INSERT INTO embeddings (id, content, vector) VALUES (?, ?, ?)');
    stmt.run(testId, TEST_STRING, Buffer.from(embedding.buffer));
    logger.info(`      Test record inserted`);

    // Test query
    const row = db.prepare('SELECT id, content FROM embeddings WHERE id = ?').get(testId) as
      | { id: string; content: string }
      | undefined;
    if (row?.id === testId) {
      logger.info(`      Test record retrieved`);
      results.databaseInitialized = true;
    }

    // Clean up
    db.close();
    logger.info(`      Database connection closed`);

    // Remove test database
    fs.unlinkSync(testDbPath);
    logger.info(`      Test database cleaned up`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.errors.push(errorMessage);
    logger.error(`Error during diagnostic:`, undefined, error instanceof Error ? error : new Error(String(error)));
  }

  // ========================================
  // Final Report
  // ========================================
  logger.info('=================================================');
  logger.info('  Diagnostic Results');
  logger.info('=================================================');

  logger.info(`Model Path Exists:           ${results.modelPathExists ? 'PASS' : 'FAIL'}`);
  logger.info(`Environment Configured:      ${results.envConfigured ? 'PASS' : 'FAIL'}`);
  logger.info(`Model Initialized:           ${results.modelInitialized ? 'PASS' : 'FAIL'}`);
  logger.info(`Embedding Generated:         ${results.embeddingGenerated ? 'PASS' : 'FAIL'}`);
  logger.info(`Dimension Correct (384):     ${results.dimensionCorrect ? 'PASS' : 'FAIL'}`);
  logger.info(`Database Initialized:        ${results.databaseInitialized ? 'PASS' : 'FAIL'}`);

  if (results.errors.length > 0) {
    logger.warn('Errors:');
    results.errors.forEach((error, index) => {
      logger.warn(`  ${index + 1}. ${error}`);
    });
  }

  const allPassed =
    results.modelPathExists &&
    results.envConfigured &&
    results.modelInitialized &&
    results.embeddingGenerated &&
    results.dimensionCorrect &&
    results.databaseInitialized &&
    results.errors.length === 0;

  logger.info('=================================================');
  if (allPassed) {
    logger.info('  STATUS: ALL CHECKS PASSED');
  } else {
    logger.warn('  STATUS: SOME CHECKS FAILED');
  }
  logger.info('=================================================');

  process.exit(allPassed ? 0 : 1);
}

// Run the diagnostic
runDiagnostic().catch((error) => {
  logger.error('Fatal error running diagnostic:', undefined, error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
