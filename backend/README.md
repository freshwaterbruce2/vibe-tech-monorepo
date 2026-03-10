# Vibe Tech Backend

Express.js backend API with SQLite database for Vibe Tech ecosystem.

## Quick Start

```bash
# Development
npm run dev

# Production  
npm run start
```

Server runs at `http://localhost:9001`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/api/health` | Health check |
| GET/POST/PUT/DELETE | `/api/customers` | Customer CRUD |
| GET/POST/PUT/DELETE | `/api/leads` | Lead CRUD |
| GET/POST | `/api/invoices` | Invoice management |
| GET/POST/DELETE | `/api/blog` | Blog posts |

## Database

SQLite database stored at `D:\vibe-tech-data\vibetech.db`

Tables: `customers`, `leads`, `invoices`, `blog_posts`

## Testing

```bash
npm test
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9001` | Server port |
| `TEST_DB_PATH` | - | Override DB path for tests |
