import { createBookingApiServer } from './lib/business-booking-platform-next-backend';

const DEFAULT_PORT = 3020;

function readArgValue(name: string): string | undefined {
  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((entry) => entry.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;

  return process.argv[index + 1];
}

const configuredPort =
  readArgValue('port') ?? process.env['BUSINESS_BOOKING_API_PORT'] ?? process.env['PORT'];
const parsedPort = Number.parseInt(configuredPort ?? '', 10);
const port = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;
const host =
  readArgValue('host') ??
  process.env['BUSINESS_BOOKING_API_HOST'] ??
  process.env['HOST'] ??
  '0.0.0.0';

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
