import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { EvaluationContext, Environment, FeatureFlag, EvaluationResult } from '@vibetech/feature-flags-core';
import { FlagService } from '../services/flag-service.js';
import { EvaluationService } from '../services/evaluation.js';
import { KillSwitchService } from '../services/kill-switch.js';

// Validation schemas
const CreateFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9._-]+$/i),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['boolean', 'percentage', 'variant', 'kill_switch']),
  enabled: z.boolean().default(false),
  environments: z.record(z.string(), z.object({
    enabled: z.boolean(),
    percentage: z.number().min(0).max(100).optional(),
  })),
  rules: z.array(z.object({
    id: z.string(),
    attribute: z.string(),
    operator: z.string(),
    value: z.unknown(),
    enabled: z.boolean().default(true),
  })).optional(),
  killSwitch: z.object({
    priority: z.enum(['critical', 'high', 'normal']),
    notifyOnTrigger: z.boolean().default(true),
    webhookUrl: z.string().url().optional(),
  }).optional(),
  variants: z.array(z.object({
    key: z.string(),
    name: z.string(),
    weight: z.number().min(0).max(100),
    payload: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateFlagSchema = CreateFlagSchema.partial();

const EvaluateSchema = z.object({
  flagKeys: z.array(z.string()).optional(),
  context: z.object({
    environment: z.enum(['dev', 'staging', 'prod']),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    appName: z.string().optional(),
    appVersion: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  }),
});

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

function requiredParam(value: unknown): string | undefined {
  const str = firstString(value);
  return str && str.length > 0 ? str : undefined;
}

function getUserId(req: Request): string {
  return firstString(req.headers['x-user-id']) ?? 'system';
}

function getEnvironment(req: Request): Environment {
  const env = firstString(req.headers['x-environment']);
  if (env === 'dev' || env === 'staging' || env === 'prod') {
    return env;
  }
  return 'dev';
}

export function createRoutes(
  flagService: FlagService,
  evaluationService: EvaluationService,
  killSwitchService: KillSwitchService
): Router {
  const router = Router();

  // GET /api/flags - List all flags
  router.get('/flags', (_req: Request, res: Response) => {
    try {
      const flags = flagService.getAllFlags();
      res.json({
        flags,
        hash: Date.now().toString(36),
        timestamp: new Date().toISOString(),
      });
    } catch (_error) {
      res.status(500).json({ error: 'Failed to fetch flags' });
    }
  });

  // GET /api/flags/:key - Get flag by key
  router.get('/flags/:key', (req: Request, res: Response) => {
    try {
      const key = requiredParam(req.params.key);
      if (!key) {
        return res.status(400).json({ error: 'Missing flag key' });
      }

      const flag = flagService.getFlagByKey(key);
      if (!flag) {
        return res.status(404).json({ error: 'Flag not found' });
      }
      return res.json(flag);
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to fetch flag' });
    }
  });

  // POST /api/flags - Create flag
  router.post('/flags', (req: Request, res: Response) => {
    try {
      const result = CreateFlagSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Validation failed', details: result.error.issues });
      }

      const existing = flagService.getFlagByKey(result.data.key);
      if (existing) {
        return res.status(409).json({ error: 'Flag with this key already exists' });
      }

      const userId = getUserId(req);
      const flag = flagService.createFlag({
        ...result.data,
        rules: result.data.rules ?? [],
        variants: result.data.variants ?? [],
        tags: result.data.tags ?? [],
        createdBy: userId,
      } as Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>);

      return res.status(201).json(flag);
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to create flag' });
    }
  });

  // PUT /api/flags/:id - Update flag
  router.put('/flags/:id', (req: Request, res: Response) => {
    try {
      const result = UpdateFlagSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Validation failed', details: result.error.issues });
      }

      const id = requiredParam(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Missing flag id' });
      }

      const userId = getUserId(req);
      const updated = flagService.updateFlag(
        id,
        result.data as Partial<FeatureFlag>,
        userId
      );

      if (!updated) {
        return res.status(404).json({ error: 'Flag not found' });
      }

      return res.json(updated);
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to update flag' });
    }
  });

  // DELETE /api/flags/:id - Delete flag
  router.delete('/flags/:id', (req: Request, res: Response) => {
    try {
      const id = requiredParam(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Missing flag id' });
      }

      const userId = getUserId(req);
      const deleted = flagService.deleteFlag(
        id,
        userId
      );

      if (!deleted) {
        return res.status(404).json({ error: 'Flag not found' });
      }

      return res.status(204).send();
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to delete flag' });
    }
  });

  // PATCH /api/flags/:id/enable - Toggle flag
  router.patch('/flags/:id/enable', (req: Request, res: Response) => {
    try {
      const id = requiredParam(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Missing flag id' });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }

      const userId = getUserId(req);
      const flag = flagService.toggleFlag(
        id,
        enabled,
        userId
      );

      if (!flag) {
        return res.status(404).json({ error: 'Flag not found' });
      }

      return res.json(flag);
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to toggle flag' });
    }
  });

  // GET /api/flags/:id/history - Get flag audit history
  router.get('/flags/:id/history', (req: Request, res: Response) => {
    try {
      const id = requiredParam(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Missing flag id' });
      }

      const flag = flagService.getFlagById(id);
      if (!flag) {
        return res.status(404).json({ error: 'Flag not found' });
      }

      const limitRaw = firstString(req.query.limit);
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : Number.NaN;
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
      const history = flagService.getAuditLog(id, limit);
      return res.json({ history });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // POST /api/evaluate - Evaluate flags for context
  router.post('/evaluate', (req: Request, res: Response) => {
    try {
      const result = EvaluateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Validation failed', details: result.error.issues });
      }

      const { flagKeys, context } = result.data;
      let flags: Record<string, EvaluationResult>;

      if (flagKeys && flagKeys.length > 0) {
        flags = evaluationService.evaluateMultiple(flagKeys, context as EvaluationContext);
      } else {
        flags = evaluationService.evaluateAll(context as EvaluationContext);
      }

      return res.json({
        flags,
        timestamp: new Date().toISOString(),
      });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to evaluate flags' });
    }
  });

  // POST /api/evaluate/:key - Evaluate single flag
  router.post('/evaluate/:key', (req: Request, res: Response) => {
    try {
      const key = requiredParam(req.params.key);
      if (!key) {
        return res.status(400).json({ error: 'Missing flag key' });
      }

      const context: EvaluationContext = {
        environment: getEnvironment(req),
        userId: req.body.userId,
        sessionId: req.body.sessionId,
        appName: req.body.appName,
        appVersion: req.body.appVersion,
        attributes: req.body.attributes,
      };

      const result = evaluationService.evaluate(key, context);
      return res.json(result);
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to evaluate flag' });
    }
  });

  // GET /api/kill-switch/active - Get active kill switches
  router.get('/kill-switch/active', (_req: Request, res: Response) => {
    try {
      const flags = killSwitchService.getActiveKillSwitches();
      return res.json({ flags });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to fetch kill switches' });
    }
  });

  // POST /api/kill-switch/:key/activate - Activate kill switch
  router.post('/kill-switch/:key/activate', (req: Request, res: Response) => {
    try {
      const key = requiredParam(req.params.key);
      if (!key) {
        return res.status(400).json({ error: 'Missing flag key' });
      }

      const userId = getUserId(req);
      const result = killSwitchService.activate(
        key,
        userId,
        req.body.reason
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, flag: result.flag });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to activate kill switch' });
    }
  });

  // POST /api/kill-switch/:key/deactivate - Deactivate kill switch
  router.post('/kill-switch/:key/deactivate', (req: Request, res: Response) => {
    try {
      const key = requiredParam(req.params.key);
      if (!key) {
        return res.status(400).json({ error: 'Missing flag key' });
      }

      const userId = getUserId(req);
      const result = killSwitchService.deactivate(
        key,
        userId,
        req.body.reason
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, flag: result.flag });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to deactivate kill switch' });
    }
  });

  // GET /api/health - Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
