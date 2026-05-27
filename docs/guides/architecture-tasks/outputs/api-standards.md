# API Standards Implementation (ARCH-3.2)

## 1. Overview

This document defines the standard API conventions for all VibeTech backend services. All new and migrated services must conform to these standards.

---

## 2. REST Conventions

### 2.1 HTTP Methods
| Method | Usage |
|--------|-------|
| `GET` | Retrieve resource(s). Idempotent. No request body. |
| `POST` | Create resource. Returns `201 Created` with the new resource. |
| `PUT` | Full update. Replace entire resource. Returns `200 OK`. |
| `PATCH` | Partial update. Modify specific fields. Returns `200 OK`. |
| `DELETE` | Remove resource. Returns `204 No Content`. |

### 2.2 URL Conventions
```
/api/v1/{resource}           # Collection
/api/v1/{resource}/:id       # Single item
/api/v1/{resource}/:id/{sub} # Nested resource
```

- Use **kebab-case** for multi-word resources: `/api/v1/booking-requests`
- Use **plural nouns**: `/api/v1/users`, not `/api/v1/user`
- API version prefix: `/api/v1/` (increment major version for breaking changes)

---

## 3. Standard Response Envelope

All API responses must use this envelope:

```typescript
// packages/types/src/api.ts (or @vibetech/types/api)

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;      // Machine-readable error code, e.g. "VALIDATION_ERROR"
  message: string;   // Human-readable message
  details?: unknown; // Optional structured details (e.g., validation field errors)
}

export interface ResponseMeta {
  timestamp: string; // ISO 8601
  page?: number;
  pageSize?: number;
  total?: number;
  requestId?: string;
}
```

### 3.1 Success Response Examples

```json
// GET /api/v1/users/123
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Alice",
    "email": "alice@example.com"
  },
  "meta": {
    "timestamp": "2026-05-27T06:00:00Z"
  }
}

// GET /api/v1/users (paginated)
{
  "success": true,
  "data": [...],
  "meta": {
    "timestamp": "2026-05-27T06:00:00Z",
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

### 3.2 Error Response Examples

```json
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "email": ["Must be a valid email address"],
      "name": ["Required field"]
    }
  },
  "meta": { "timestamp": "2026-05-27T06:00:00Z" }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User 123 not found"
  },
  "meta": { "timestamp": "2026-05-27T06:00:00Z" }
}
```

---

## 4. Error Code Registry

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/params failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream dependency unavailable |

---

## 5. Authentication & Authorization

### 5.1 Bearer Token
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### 5.2 JWT Claims
```typescript
interface JwtPayload {
  sub: string;        // User ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
```

### 5.3 Public vs Protected Routes
- Mark public routes explicitly in route definitions
- Default to protected; use `@Public()` decorator or route-level config

---

## 6. Shared Middleware (via `@vibetech/core/service`)

The following middleware is available from the shared package:

```typescript
import { 
  createCorsMiddleware, 
  createRateLimiter,
  createRequestLogger,
  createErrorHandler,
  createAuthMiddleware
} from '@vibetech/core/service';
```

### 6.1 CORS Configuration
```typescript
// Standard CORS for all services
app.use(createCorsMiddleware({
  origins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  credentials: true
}));
```

### 6.2 Error Handler
Always mount last:
```typescript
app.use(createErrorHandler()); // Converts errors to ApiResponse format
```

---

## 7. Framework-Specific Patterns

### 7.1 Hono (Preferred for new services)
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

app.post('/api/v1/users',
  zValidator('json', z.object({ name: z.string(), email: z.string().email() })),
  async (c) => {
    const body = c.req.valid('json');
    const user = await createUser(body);
    return c.json({ success: true, data: user }, 201);
  }
);

export default app;
```

### 7.2 Express (Legacy services)
```typescript
import express from 'express';
import { z } from 'zod';

const router = express.Router();

router.post('/users', async (req, res, next) => {
  try {
    const body = UserSchema.parse(req.body);
    const user = await createUser(body);
    res.status(201).json({ success: true, data: user, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
});
```

---

## 8. OpenAPI Specification

All services must expose an OpenAPI schema. Minimum requirements:
- Endpoint: `GET /openapi.json`
- Include: all routes, request/response schemas, auth requirements
- Tool: Use `@hono/zod-openapi` for Hono, or `openapi-typescript` codegen

---

## 9. Compliance Checklist

- [ ] All endpoints return `ApiResponse<T>` envelope
- [ ] HTTP status codes are accurate
- [ ] Auth middleware applied to protected routes
- [ ] CORS configured via shared middleware
- [ ] Error handler mounted last
- [ ] OpenAPI schema exposed at `/openapi.json`
- [ ] Input validation using Zod schemas

---

*Generated: 2026-05-27 | Status: COMPLETED | Task: ARCH-3.2*
