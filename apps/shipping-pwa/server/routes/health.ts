import { Router } from 'express';
import type { Request, Response } from 'express';
import { healthService, deepSeekService } from '../services/index.js';
import { extractRecommendations, getFallbackRecommendations } from '../utils/index.js';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  const health = healthService.getHealth();
  const circuitBreakerStatus = deepSeekService.getCircuitBreakerStatus();

  res.json({
    ...health,
    services: {
      deepseek: circuitBreakerStatus
    }
  });
});

// Efficiency metrics endpoint
router.get('/metrics', (req: Request, res: Response) => {
  const health = healthService.getHealth();

  res.json({
    performance: {
      uptime: health.uptime,
      requestsPerMinute: Math.round(health.requests / (health.uptime / 60)),
      errorRate: health.errorRate,
      memoryUsage: `${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`
    },
    services: {
      deepseek: deepSeekService.getCircuitBreakerStatus()
    },
    timestamp: new Date().toISOString()
  });
});

// DeepSeek AI Analysis endpoint (tenant-aware)
router.post('/analyze', async (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { doorEntries = [], palletData = {} } = req.body;

    if (!Array.isArray(doorEntries)) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'doorEntries must be an array'
      });
    }

    const analysisData = {
      doorEntries,
      palletData,
      tenant: {
        name: tenant.name,
        warehouseCode: tenant.config.warehouseCode,
        doorRange: tenant.config.doorNumberRange,
        freightTypes: tenant.config.freightTypes
      },
      timestamp: new Date().toISOString()
    };

    const analysis = await deepSeekService.analyzeShipment(analysisData);

    res.json({
      success: true,
      analysis,
      recommendations: extractRecommendations(analysis),
      tenantContext: {
        warehouseName: tenant.config.warehouseName,
        maxDoors: tenant.subscription.maxDoors
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      error: 'Analysis failed',
      message: errorMessage,
      fallbackRecommendations: getFallbackRecommendations(req.body),
      timestamp: new Date().toISOString()
    });
  }
});

// Graceful shutdown endpoint
router.post('/shutdown', (req: Request, res: Response) => {
  res.json({ message: 'Server shutting down gracefully...' });

  setTimeout(() => {
    console.log('Server shutting down...');
    process.exit(0);
  }, 1000);
});

export default router;
