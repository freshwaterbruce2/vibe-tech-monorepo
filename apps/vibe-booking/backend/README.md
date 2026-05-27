# Business Booking Platform Next Backend

Express API for the Business Booking Platform Next MVP.

Local Nx serve pins the API to `http://localhost:3020` so the frontend Vite proxy can
reach it consistently. Deployment can still override the port with
`BUSINESS_BOOKING_API_PORT` or `PORT`.

## Building

Run `pnpm nx build business-booking-platform-next-backend`.

## Serving

Run `pnpm nx serve business-booking-platform-next-backend`.

## Running unit tests

Run `pnpm nx test business-booking-platform-next-backend`.
