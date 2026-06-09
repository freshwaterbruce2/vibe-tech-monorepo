/**
 * Inngest Serve Endpoint for Nova-Agent RAG Pipeline
 *
 * Run as a sidecar process alongside the Tauri desktop app:
 *
 *   pnpm inngest:dev    — start with Inngest Dev Server
 *   pnpm inngest:serve  — start the serve endpoint only
 *
 * The Inngest Dev Server UI is at http://localhost:8288
 * This endpoint listens on http://localhost:3100/api/inngest
 */

import { createServer } from 'node:http';
import { serve } from 'inngest/node';
import { inngest } from '@vibetech/inngest-client';
import { ragIndexPipeline } from './inngest-functions.js';

const PORT = Number(process.env.INNGEST_SERVE_PORT ?? 3100);

const handler = serve({
  client: inngest,
  functions: [ragIndexPipeline],
});

const server = createServer(handler);

server.listen(PORT, () => {
  console.error(`[inngest-serve] Listening on http://localhost:${PORT}/api/inngest`);
  console.error(`[inngest-serve] Functions registered: rag-index-pipeline`);
  console.error(`[inngest-serve] Start the Inngest Dev Server: npx inngest-cli@latest dev`);
});
