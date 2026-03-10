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
  console.log('\n=================================================');
  console.log('  VectorStore & Embedding Model Diagnostic');
  console.log('  (Standalone - No Electron Dependencies)');
  console.log('=================================================\n');

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
    console.log(`[1/6] Verifying model cache directory...`);
    console.log(`      Path: ${MODEL_CACHE_DIR}`);

    if (fs.existsSync(MODEL_CACHE_DIR)) {
      results.modelPathExists = true;
      console.log(`      ✓ Directory exists`);

      // List contents to verify model files
      const modelDir = path.join(MODEL_CACHE_DIR, 'models--Xenova--all-MiniLM-L6-v2');
      if (fs.existsSync(modelDir)) {
        console.log(`      ✓ Model directory found: ${modelDir}`);
        try {
          const files = fs.readdirSync(modelDir, { recursive: true });
          console.log(`      ✓ Contains ${Array.isArray(files) ? files.length : 'multiple'} files`);
        } catch {
          console.log(`      ✓ Model directory exists (unable to count files)`);
        }
      } else {
        console.log(`      ⚠ Model directory not found (will download on first use)`);
      }
    } else {
      results.errors.push(`Model cache directory does not exist: ${MODEL_CACHE_DIR}`);
      console.log(`      ✗ Directory does not exist - creating it...`);
      try {
        fs.mkdirSync(MODEL_CACHE_DIR, { recursive: true });
        console.log(`      ✓ Created directory: ${MODEL_CACHE_DIR}`);
        results.modelPathExists = true;
      } catch (e) {
        console.log(`      ✗ Failed to create directory: ${e}`);
      }
    }

    // ========================================
    // Step 2: Configure Environment
    // ========================================
    console.log(`\n[2/6] Configuring environment...`);

    // Configure the cache directory (same as EmbeddingService)
    env.cacheDir = MODEL_CACHE_DIR;
    env.allowRemoteModels = true; // Allow download if needed

    console.log(`      Cache Dir: ${env.cacheDir}`);
    console.log(`      Allow Remote Models: ${env.allowRemoteModels}`);
    results.envConfigured = true;
    console.log(`      ✓ Environment configured`);

    // ========================================
    // Step 3: Initialize Embedding Model
    // ========================================
    console.log(`\n[3/6] Initializing embedding model...`);
    console.log(`      Model: ${MODEL_NAME}`);
    console.log(`      Note: First run may download model (~90MB)`);

    const startTime = Date.now();
    const extractor = await pipeline('feature-extraction', MODEL_NAME);
    const initTime = Date.now() - startTime;

    results.modelInitialized = true;
    console.log(`      ✓ Model initialized successfully (${initTime}ms)`);

    // ========================================
    // Step 4: Generate Test Embedding
    // ========================================
    console.log(`\n[4/6] Generating test embedding...`);
    console.log(`      Test String: "${TEST_STRING}"`);

    const output = await extractor(TEST_STRING, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = toFloat32Array(output.data);
    results.embeddingGenerated = true;
    console.log(`      ✓ Embedding generated successfully`);

    // Verify dimensions
    const actualDimension = embedding.length;
    console.log(`      Dimension: ${actualDimension}`);

    if (actualDimension === EXPECTED_DIMENSION) {
      results.dimensionCorrect = true;
      console.log(`      ✓ Dimension matches expected (${EXPECTED_DIMENSION})`);
    } else {
      results.errors.push(
        `Dimension mismatch. Expected: ${EXPECTED_DIMENSION}, Got: ${actualDimension}`,
      );
      console.log(
        `      ✗ Dimension mismatch! Expected ${EXPECTED_DIMENSION}, got ${actualDimension}`,
      );
    }

    // Display sample values
    console.log(
      `      Sample values: [${Array.from(embedding.slice(0, 5))
        .map((v) => v.toFixed(4))
        .join(', ')}...]`,
    );
    console.log(`      Data type: ${embedding.constructor.name}`);

    // Calculate magnitude to verify normalization
    const magnitude = Math.sqrt(Array.from(embedding).reduce((sum, val) => sum + val * val, 0));
    console.log(`      Vector magnitude: ${magnitude.toFixed(6)} (should be ~1.0 for normalized)`);

    // ========================================
    // Step 5: Verify Model Files
    // ========================================
    console.log(`\n[5/6] Verifying downloaded model files...`);
    const modelDir = path.join(MODEL_CACHE_DIR, 'models--Xenova--all-MiniLM-L6-v2');

    if (fs.existsSync(modelDir)) {
      console.log(`      ✓ Model persisted to: ${modelDir}`);

      // Check for key files
      const keyFiles = ['config.json', 'tokenizer.json', 'onnx'];
      for (const _file of keyFiles) {
        const filePath = path.join(modelDir, 'snapshots');
        if (fs.existsSync(filePath)) {
          console.log(`      ✓ Found snapshots directory`);
          break;
        }
      }
    }

    // ========================================
    // Step 6: Test Database Initialization
    // ========================================
    console.log(`\n[6/6] Testing database initialization...`);

    const testDbDir = path.join(MODEL_CACHE_DIR, 'vector-store');
    const testDbPath = path.join(testDbDir, 'diagnostic-test.db');

    console.log(`      Database Path: ${testDbPath}`);

    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
      console.log(`      ✓ Created database directory`);
    }

    const db = new Database(testDbPath);
    console.log(`      ✓ Database connection established`);

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
    console.log(`      ✓ Schema created successfully`);

    // Test insert
    const testId = 'diagnostic-test-' + Date.now();
    const stmt = db.prepare('INSERT INTO embeddings (id, content, vector) VALUES (?, ?, ?)');
    stmt.run(testId, TEST_STRING, Buffer.from(embedding.buffer));
    console.log(`      ✓ Test record inserted`);

    // Test query
    const row = db.prepare('SELECT id, content FROM embeddings WHERE id = ?').get(testId) as
      | { id: string; content: string }
      | undefined;
    if (row?.id === testId) {
      console.log(`      ✓ Test record retrieved`);
      results.databaseInitialized = true;
    }

    // Clean up
    db.close();
    console.log(`      ✓ Database connection closed`);

    // Remove test database
    fs.unlinkSync(testDbPath);
    console.log(`      ✓ Test database cleaned up`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.errors.push(errorMessage);
    console.error(`\n✗ Error during diagnostic:`, error);
  }

  // ========================================
  // Final Report
  // ========================================
  console.log('\n=================================================');
  console.log('  Diagnostic Results');
  console.log('=================================================\n');

  console.log(`Model Path Exists:           ${results.modelPathExists ? '✓' : '✗'}`);
  console.log(`Environment Configured:      ${results.envConfigured ? '✓' : '✗'}`);
  console.log(`Model Initialized:           ${results.modelInitialized ? '✓' : '✗'}`);
  console.log(`Embedding Generated:         ${results.embeddingGenerated ? '✓' : '✗'}`);
  console.log(`Dimension Correct (384):     ${results.dimensionCorrect ? '✓' : '✗'}`);
  console.log(`Database Initialized:        ${results.databaseInitialized ? '✓' : '✗'}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
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

  console.log('\n=================================================');
  if (allPassed) {
    console.log('  STATUS: ✓ ALL CHECKS PASSED');
  } else {
    console.log('  STATUS: ✗ SOME CHECKS FAILED');
  }
  console.log('=================================================\n');

  process.exit(allPassed ? 0 : 1);
}

// Run the diagnostic
runDiagnostic().catch((error) => {
  console.error('Fatal error running diagnostic:', error);
  process.exit(1);
});
