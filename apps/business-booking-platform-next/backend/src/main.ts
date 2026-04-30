import { createBookingApiServer } from './lib/business-booking-platform-next-backend';

const DEFAULT_PORT = 3020;

const port = Number.parseInt(process.env['PORT'] ?? '', 10) || DEFAULT_PORT;
const host = process.env['HOST'] ?? '0.0.0.0';

const app = createBookingApiServer();
const server = app.listen(port, host, () => {
  console.log(`Business Booking Next API listening on http://${host}:${port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}; shutting down Business Booking Next API`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
