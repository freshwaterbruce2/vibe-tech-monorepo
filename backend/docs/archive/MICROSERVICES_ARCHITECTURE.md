# Microservices Architecture Design

## Overview

This document outlines the microservices architecture designed for the C:\dev monorepo.

## Services Summary

| Service | Port | Domain | Tech Stack | Status |
|---------|------|--------|------------|--------|
| API Gateway | 3000 | Cross-Cutting | Node.js, Express | NEW |
| Auth Service | 3001 | Identity | Node.js, TypeScript, Passport | NEW |
| Trading Service | 3002 | Trading | Python, FastAPI | WRAP EXISTING |
| Notification Service | 3003 | Communication | Node.js, TypeScript | NEW |
| Content Service | 3004 | Content | Node.js, Sharp | NEW |
| Booking Service | 3005 | Business | Node.js, TypeScript | NEW |
| Workflow Service | 3006 | Orchestration | Node.js, BullMQ | EXISTS (enhance) |
| Analytics Service | 3007 | Intelligence | Python, FastAPI | NEW |
| Search Service | 3008 | Discovery | Node.js, Meilisearch | EXISTS (enhance) |
| IPC Gateway | 3009 | Desktop | Node.js, WebSocket | EXISTS (enhance) |

## Architecture Principles

### 1. Single Responsibility

Each service owns one domain and its data.

### 2. API-First Design

All services expose REST APIs (or gRPC for high-performance paths).

### 3. Event-Driven Communication

Services communicate async via message queues for non-critical paths.

### 4. Shared Nothing

No shared databases between services (except read replicas for reporting).

### 5. Observability

All services emit structured logs, metrics, and traces.

## Critical Path: Trading Service

⚠️ **LIVE MONEY SYSTEM**

The Trading Service wraps the existing Python trading bot with a secure API layer:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   API Gateway   │────▶│  Trading Service │────▶│  Kraken API │
└─────────────────┘     └──────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  SQLite (trading.db) │
                        └──────────────────┘
```

**Safety Features:**

- Circuit breaker prevents cascading failures
- Nonce manager ensures API replay protection
- Instance lock prevents duplicate bot instances
- All trading actions are logged and auditable

## Service Communication Matrix

```
┌────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│                │ GW  │ Auth│ Trade│ Notif│ Cont│ Book│ Work│ Anal│ IPC │
├────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ API Gateway    │  -  │  S  │  S  │  S  │  S  │  S  │  S  │  S  │  S  │
│ Auth Service   │     │  -  │     │  A  │     │     │     │     │     │
│ Trading Service│     │     │  -  │  A  │     │     │     │  A  │     │
│ Notification   │     │     │     │  -  │     │     │     │     │     │
│ Content Service│     │     │     │     │  -  │     │     │     │     │
│ Booking Service│     │  S  │     │  A  │     │  -  │     │     │     │
│ Workflow Svc   │     │     │     │  A  │     │     │  -  │     │     │
│ Analytics Svc  │     │     │     │     │     │     │     │  -  │     │
│ IPC Gateway    │     │  S  │     │     │     │     │     │     │  -  │
└────────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘

S = Synchronous (REST/gRPC)
A = Asynchronous (Message Queue)
```

## Implementation Priority

### Phase 1: Foundation (Week 1-2)

1. Create `@dev/service-common` package
2. Set up API Gateway
3. Extract Auth Service

### Phase 2: Core Services (Week 3-4)

4. Wrap Trading Bot with FastAPI service
2. Implement Notification Service
3. Enhance existing Workflow Engine

### Phase 3: Business Services (Week 5-6)

7. Content Service
2. Booking Service
3. Analytics Service foundation

### Phase 4: Integration (Week 7-8)

10. Docker Compose setup
2. CI/CD pipelines
3. Monitoring & alerting

## Next Steps

See individual service directories for detailed implementation guides.
