import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbPath, initializeDatabase } from './db/index.js';
import auth from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
initializeDatabase();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString(), dbPath }));

// Import routes
import achievements from './routes/achievements.js';
import activity from './routes/activity.js';
import quests from './routes/quests.js';
import rewards from './routes/rewards.js';
import users from './routes/users.js';

// Public routes
app.route('/api/auth', auth);

// Protected routes (require authentication)
app.route('/api/quests', quests);
app.route('/api/rewards', rewards);
app.route('/api/users', users);
app.route('/api/achievements', achievements);
app.route('/api/activity', activity);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '..', 'client');

  // Serve static assets
  app.use('/assets/*', serveStatic({ root: clientPath }));

  // Serve index.html for all other routes (SPA fallback)
  app.get('*', serveStatic({ path: path.join(clientPath, 'index.html') }));
}

const port = parseInt(process.env.PORT || '3003');

console.log(`🚀 VibeBlox API Server starting...`);
console.log(`📍 Port: ${port}`);
console.log(`🗄️  Database: ${dbPath}`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
  },
);
