import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { historyRouter } from './routes/history.js';
import { optimizeRouter } from './routes/optimize.js';

const app = express();
const PORT = process.env.PORT ?? 9001;

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json());

// Rate limiting: 10 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (_req, res) => {
    const retryAfter = Math.ceil(
      ((res.getHeader('X-RateLimit-Reset') as number) - Date.now()) / 1000,
    );
    res.set('Retry-After', String(retryAfter > 0 ? retryAfter : 60));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: retryAfter > 0 ? retryAfter : 60,
    });
  },
});

// Apply rate limiting only to /api/optimize
app.use('/api/optimize', limiter);

// Routes
app.use('/api/optimize', optimizeRouter);
app.use('/api/history', historyRouter);

// Health check with API status
app.get('/api/health', (_req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  res.json({
    status: 'ok',
    apiConfigured: Boolean(apiKey && apiKey.length > 0),
    timestamp: new Date().toISOString(),
  });
});

// Update API key at runtime (stores in memory for this session)
app.post('/api/settings/apikey', (req, res) => {
  const { apiKey } = req.body;
  if (apiKey && typeof apiKey === 'string') {
    process.env.OPENROUTER_API_KEY = apiKey;
    res.json({ success: true, message: 'API key updated for this session' });
  } else {
    res.status(400).json({ error: 'Invalid API key' });
  }
});

// Legacy health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Prompt Engineer API running on http://localhost:${PORT}`);
});
