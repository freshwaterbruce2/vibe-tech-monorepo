# VibeBlox Production Package

## Installation

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Initialize database:
```bash
npm run db:migrate
npm run db:seed
```

4. Start the server:
```bash
npm start
```

The application will be available at http://localhost:3003

## Directory Structure

- `client/` - Frontend static files (built React app)
- `server/` - Backend API server (Hono)
- `.env` - Environment configuration

## Database

Default location: D:\data\vibeblox\vibeblox.db

Change via VIBEBLOX_DATABASE_PATH environment variable.
