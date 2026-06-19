import { type FastifyInstance } from 'fastify';
import { requireAuth } from './authHelpers.js';

export function registerProRoutes(app: FastifyInstance): void {
  app.get('/api/pro', { preHandler: [requireAuth] }, async () => {
    return {
      feature: 'analytics.revenue',
      plan: 'pro',
    };
  });

  app.post('/api/pro/rewrite', { preHandler: [requireAuth] }, async () => {
    return {
      rewrite: {
        recommendedCta: 'Upgrade to automate this proposal workflow',
      },
    };
  });
}
