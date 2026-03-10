import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { openRouterRouter } from './routes/openrouter';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '60'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request logging
app.use(requestLogger);

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    name: 'OpenRouter Proxy API',
    version: '1.0.0',
    status: 'running',
    description: 'Centralized OpenRouter API proxy for VibeTech AI projects',
    endpoints: {
      health: 'GET /health',
      models: 'GET /api/openrouter/models',
      chat: 'POST /api/openrouter/chat',
      usage: 'GET /api/openrouter/usage?period=24'
    },
    docs: {
      readme: 'See backend/openrouter-proxy/README.md',
      quickStart: 'See backend/openrouter-proxy/QUICK_START.md',
      verification: 'See backend/openrouter-proxy/VERIFICATION_REPORT.md'
    },
    projects: [
      'vibe-code-studio',
      'nova-agent',
      'vibe-tutor',
      'vibe-justice',
      'vibe-shop',
      'business-booking-platform',
      'prompt-engineer'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/openrouter', openRouterRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`OpenRouter Proxy running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Rate limit: ${process.env.RATE_LIMIT_MAX_REQUESTS} requests per ${process.env.RATE_LIMIT_WINDOW_MS}ms`);
});

export default app;
