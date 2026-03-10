import Fastify from 'fastify';
import { db } from './db/index.js';
import { bookingsRoutes } from './routes/bookings.js';
import { healthRoutes } from './routes/health.js';

const fastify = Fastify({
  logger: true,
});

// Register routes
fastify.register(healthRoutes, { prefix: '/api' });
fastify.register(bookingsRoutes, { prefix: '/api' });

const start = async () => {
  try {
    // Ensure DB is initialized
    console.log('Database initialized at:', db.name);

    // Start server
    await fastify.listen({ port: 3004, host: '0.0.0.0' });
    console.log('vibe-booking-backend running on http://localhost:3004');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

void start();
