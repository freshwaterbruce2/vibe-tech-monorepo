import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Prevent listening
process.env.EXPORT_OPENAPI = 'true';

// Import Fastify app
const { app } = await import('../src/index.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log('Building Fastify routes and OpenAPI spec...');
  await app.ready();
  
  // Get swagger JSON
  const openapiSpec = app.swagger();
  
  const outputPath = path.join(__dirname, '..', '..', 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(openapiSpec, null, 2), 'utf-8');
  
  console.log(`Successfully exported OpenAPI spec to: ${outputPath}`);
  process.exit(0);
} catch (err) {
  console.error('Failed to export OpenAPI spec:', err);
  process.exit(1);
}
