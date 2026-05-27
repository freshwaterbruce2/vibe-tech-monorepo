import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { type AuthEnv, authMiddleware, type JWTPayload } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

app.use('*', authMiddleware);

const awardSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1),
  user_id: z.number().optional(),
});

app.post('/award', zValidator('json', awardSchema), async (c) => {
  const user = c.get('user') as JWTPayload;
  const { amount, description, user_id } = c.req.valid('json');

  // Only parents can award coins
  if (user.role !== 'parent') {
    return c.json({ success: false, error: 'Unauthorized' }, 403);
  }

  let targetUserId = user_id;

  if (!targetUserId) {
    // Find the first child user
    const childStmt = db.prepare("SELECT id FROM users WHERE role = 'child' LIMIT 1");
    const child = childStmt.get() as { id: number } | undefined;
    if (child) {
      targetUserId = child.id;
    } else {
      return c.json({ success: false, error: 'No child account found' }, 400);
    }
  }

  try {
    const tx = db.transaction(() => {
      // 1. Update user balance
      const updateStmt = db.prepare(`
        UPDATE users
        SET current_coins = current_coins + ?,
            lifetime_coins = lifetime_coins + ?
        WHERE id = ?
      `);
      updateStmt.run(amount, amount, targetUserId);

      // 2. Log transaction/activity
      const logStmt = db.prepare(`
        INSERT INTO activity_feed
        (user_id, activity_type, title, description, coins_change, icon)
        VALUES (?, 'award', 'Bonus Coins', ?, ?, '🪙')
      `);
      logStmt.run(targetUserId, description, amount);
    });

    tx();

    return c.json({ success: true, message: 'Coins awarded successfully' });
  } catch (error) {
    console.error('Award error:', error);
    return c.json({ success: false, error: 'Failed to award coins' }, 500);
  }
});

export default app;
