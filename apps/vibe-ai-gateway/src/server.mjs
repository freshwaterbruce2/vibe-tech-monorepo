import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createAuthMiddleware } from './auth.mjs';
import { createOpenRouterProvider } from './router.mjs';
import { parseModelProfile, validateChatRequest } from './core.mjs';

dotenv.config();

export function createGatewayApp({
  env = process.env,
  provider,
  authMiddleware,
} = {}) {
  const app = express();

  const openRouterKey = env.OPENROUTER_API_KEY || env.OPEN_ROUTER_KEY || '';
  const routerProvider = provider || (openRouterKey ? createOpenRouterProvider({ apiKey: openRouterKey }) : null);

  const auth = authMiddleware || createAuthMiddleware({
    allowedKeys: env.VIBE_GATEWAY_CLIENT_KEYS ? env.VIBE_GATEWAY_CLIENT_KEYS.split(',').map((k) => k.trim()) : [],
    masterKey: env.MASTER_GATEWAY_KEY || '',
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb', strict: true }));

  // Health check endpoints (unauthenticated)
  app.get(['/', '/health', '/api/health'], (req, res) => {
    const isConfigured = Boolean(routerProvider);
    return res.status(isConfigured ? 200 : 503).json({
      status: isConfigured ? 'ready' : 'unconfigured',
      service: 'vibe-ai-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Apply authentication to all following routes
  app.use(auth);

  // OpenAI-Compatible Chat Completions Endpoint
  app.post(['/v1/chat/completions', '/api/chat'], async (req, res) => {
    if (!routerProvider) {
      return res.status(503).json({
        error: {
          message: 'Vibe AI Gateway is not configured with an upstream provider.',
          type: 'service_unavailable',
        },
      });
    }

    const validation = validateChatRequest(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        error: {
          message: validation.error,
          type: 'invalid_request_error',
        },
      });
    }

    const { model, messages, temperature, max_tokens } = req.body;
    const profile = parseModelProfile(model);

    try {
      const completion = await routerProvider({
        profile,
        messages,
        options: { temperature, max_tokens },
      });

      return res.json(completion);
    } catch (err) {
      console.error(`[Gateway Server] Completion failed for client ${req.clientId || 'anonymous'}:`, err.message);

      return res.status(502).json({
        error: {
          message: 'Upstream AI model providers are currently unavailable or timed out.',
          type: 'upstream_error',
          details: err.message,
        },
      });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Endpoint not found on Vibe AI Gateway.',
        type: 'not_found',
      },
    });
  });

  return app;
}

if (process.argv[1]?.endsWith('server.mjs')) {
  const port = process.env.PORT || 8080;
  const app = createGatewayApp();
  app.listen(port, () => {
    console.log(`[Vibe AI Gateway] Running on port ${port}`);
  });
}
