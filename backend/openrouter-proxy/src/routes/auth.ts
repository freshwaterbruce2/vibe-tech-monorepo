import express from 'express';
import {
  openAuthDb,
  authenticateUser,
  createSessionToken,
  parseSessionToken,
  getUserById,
} from '@vibetech/auth';
import { logger } from '../utils/logger';

export const authRouter = express.Router();

// Health check endpoint under /api/health
authRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let db;
  try {
    db = openAuthDb();
    const user = await authenticateUser(db, email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createSessionToken(user);
    logger.info('User authenticated successfully', { email: user.email, userId: user.id });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : String(error) });
    next(error);
  } finally {
    if (db) {
      db.close();
    }
  }
});

// GET /api/auth/me
authRouter.get('/me', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header with Bearer token required' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = parseSessionToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    let db;
    try {
      db = openAuthDb();
      const user = getUserById(db, payload.sub);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      });
    } finally {
      if (db) {
        db.close();
      }
    }
  } catch (error) {
    logger.error('Auth/me error', { error: error instanceof Error ? error.message : String(error) });
    next(error);
  }
});
