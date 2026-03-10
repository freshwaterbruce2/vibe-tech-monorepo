# Nx Cloud Service - Implementation Documentation

**Created:** 2026-01-17
**Location:** `server/services/nxCloudService.ts`
**Database:** `server/db/dashboard.db`

## Overview

The Nx Cloud Service provides CI/CD build metrics for the monorepo dashboard by integrating with the Nx Cloud API. It includes intelligent fallback mechanisms using local `.nx/cache` when the API is unavailable.

## Features

✅ **Nx Cloud API Integration** - Fetches build metrics from Nx Cloud
✅ **Local Cache Fallback** - Uses `.nx/cache` when API unavailable
✅ **SQLite Persistence** - Stores build history in local database
✅ **Graceful Auth Handling** - Returns 401-aware errors when token missing
✅ **Aggregate Metrics** - Calculates performance statistics
✅ **WAL Mode** - Better concurrency for database operations

## Configuration

### Workspace ID

```
69628705131c1b679696c8f9
```

(Stored in `nx.json` as `nxCloudId`)

### Environment Variable

```bash
NX_CLOUD_ACCESS_TOKEN=your-token-here
```

**To get your token:**

1. Visit <https://cloud.nx.app/>
2. Navigate to your workspace settings
3. Generate an access token
4. Set it in your environment: `$env:NX_CLOUD_ACCESS_TOKEN="your-token"`

### Database Location

```
C:\dev\apps\monorepo-dashboard\server\db\dashboard.db
```

### Local Cache Fallback

```
C:\dev\.nx\cache
```

## API Endpoints

### 1. Connection Status

**Endpoint:** `GET /api/nx-cloud/status`

**Response:**

```json
{
  "connected": true,
  "authenticationRequired": false,
  "lastSync": "2026-01-17T10:00:00Z",
  "buildsInDatabase": 42,
  "error": null
}
```

**Auth Error Response:**

```json
{
  "connected": false,
  "authenticationRequired": true,
  "lastSync": null,
  "buildsInDatabase": 0,
  "error": "NX_CLOUD_ACCESS_TOKEN not configured"
}
```

### 2. Recent Builds

**Endpoint:** `GET /api/nx-cloud/builds?days=7`

**Query Parameters:**

- `days` (optional) - Number of days to fetch (default: 7)

**Response:**

```json
[
  {
    "id": "abc123",
    "timestamp": "2026-01-17T10:00:00Z",
    "branch": "main",
    "status": "success",
    "durationMs": 45000,
    "cacheHitRate": 0.75,
    "tasksExecuted": 5,
    "tasksCached": 15
  }
]
```

### 3. Performance Metrics

**Endpoint:** `GET /api/nx-cloud/performance`

**Response:**

```json
{
  "avgBuildTimeMs": 42000,
  "avgCacheHitRate": 0.73,
  "totalBuilds": 42,
  "successRate": 0.95,
  "fastestBuildMs": 12000,
  "slowestBuildMs": 120000
}
```

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS nx_cloud_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id TEXT UNIQUE NOT NULL,
  timestamp TEXT NOT NULL,
  branch TEXT,
  status TEXT,
  duration_ms INTEGER,
  cache_hit_rate REAL,
  tasks_executed INTEGER,
  tasks_cached INTEGER
);

CREATE INDEX IF NOT EXISTS idx_timestamp ON nx_cloud_builds(timestamp DESC);
```

## Fallback Behavior

The service implements a three-tier fallback strategy:

### Tier 1: Nx Cloud API (Preferred)

- Fetches from `https://cloud.nx.app/api/v2/workspaces/{workspaceId}/runs`
- Requires `NX_CLOUD_ACCESS_TOKEN`
- Returns complete build metrics

### Tier 2: Local Cache (.nx/cache)

- Triggered when API returns 401 (Authentication Required)
- Parses `.nx/cache/*.commit` files
- Limited metadata (no duration or cache metrics)

### Tier 3: Database

- Returns previously stored builds
- Always available
- May be stale if API/cache unavailable

## Error Handling

### Authentication Errors (401)

```typescript
{
  connected: false,
  authenticationRequired: true,
  error: "NX_CLOUD_ACCESS_TOKEN not configured"
}
```

**User Action:** Set `NX_CLOUD_ACCESS_TOKEN` environment variable

### API Errors (non-401)

```typescript
{
  connected: false,
  authenticationRequired: false,
  error: "Nx Cloud API error: 500 Internal Server Error"
}
```

**Fallback:** Returns builds from database

### Network Errors

```typescript
{
  connected: false,
  authenticationRequired: false,
  error: "Network timeout"
}
```

**Fallback:** Returns builds from database

## Usage Examples

### 1. Check Connection Status

```bash
curl http://localhost:5177/api/nx-cloud/status
```

### 2. Fetch Last 7 Days of Builds

```bash
curl http://localhost:5177/api/nx-cloud/builds?days=7
```

### 3. Get Performance Metrics

```bash
curl http://localhost:5177/api/nx-cloud/performance
```

### 4. PowerShell Test Script

```bash
.\test-nx-cloud-service.ps1
```

## Integration with Dashboard

### Frontend Integration

```typescript
import { useQuery } from '@tanstack/react-query';

// Fetch builds
const { data: builds } = useQuery({
  queryKey: ['nx-cloud-builds', days],
  queryFn: async () => {
    const res = await fetch(`/api/nx-cloud/builds?days=${days}`);
    return res.json();
  },
});

// Fetch performance
const { data: performance } = useQuery({
  queryKey: ['nx-cloud-performance'],
  queryFn: async () => {
    const res = await fetch('/api/nx-cloud/performance');
    return res.json();
  },
});
```

### Server-Side Integration

```typescript
import express from 'express';
import {
  getNxCloudStatus,
  getNxCloudBuilds,
  getNxCloudPerformance,
} from './services/nxCloudService.js';

const app = express();

app.get('/api/nx-cloud/status', async (req, res) => {
  const status = await getNxCloudStatus();
  res.json(status);
});

app.get('/api/nx-cloud/builds', async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const builds = await getNxCloudBuilds(days);
  res.json(builds);
});

app.get('/api/nx-cloud/performance', async (req, res) => {
  const performance = await getNxCloudPerformance();
  res.json(performance);
});
```

## Performance Considerations

### API Rate Limiting

- Nx Cloud API has rate limits
- Service caches results in database
- Use database for historical queries

### Database Size

- Stores all builds indefinitely
- Consider implementing cleanup (e.g., delete builds >90 days)
- Current size: ~1KB per build

### Local Cache Fallback

- Limits to 50 most recent builds
- Minimal performance impact
- Useful when API unavailable

## Troubleshooting

### Issue: "Authentication Required" Error

**Cause:** `NX_CLOUD_ACCESS_TOKEN` not set

**Solution:**

```powershell
$env:NX_CLOUD_ACCESS_TOKEN = "your-token-here"
pnpm --filter monorepo-dashboard dev:server
```

### Issue: No Builds Returned

**Cause:** No builds in database and API/cache unavailable

**Solution:**

1. Set `NX_CLOUD_ACCESS_TOKEN`
2. Restart backend server
3. Make request to `/api/nx-cloud/builds`

### Issue: Database Locked Error

**Cause:** Multiple processes accessing database

**Solution:**

- Database uses WAL mode for better concurrency
- Close other connections
- Restart backend server

### Issue: Stale Metrics

**Cause:** Database not syncing with API

**Solution:**

1. Verify `NX_CLOUD_ACCESS_TOKEN` is set
2. Check `/api/nx-cloud/status` for connection status
3. Delete `dashboard.db` to force re-fetch

## Security Considerations

### Access Token Storage

- **DO NOT** commit `NX_CLOUD_ACCESS_TOKEN` to Git
- Store in environment variables only
- Use `.env` file (add to `.gitignore`)

### Database Security

- Database stored locally (`server/db/dashboard.db`)
- Not accessible from frontend
- Contains only build metadata (no secrets)

### API Requests

- All requests use HTTPS
- Bearer token authentication
- 10-second timeout

## Future Enhancements

### Planned Features

- [ ] Database cleanup (delete builds >90 days)
- [ ] Real-time WebSocket updates
- [ ] Build comparison tools
- [ ] Trend analysis (week-over-week)
- [ ] Alert system for build failures
- [ ] Integration with Slack/Discord

### Performance Optimizations

- [ ] Background sync job (every 5 minutes)
- [ ] Incremental updates (fetch only new builds)
- [ ] Database indexes for common queries
- [ ] Caching layer (Redis)

## Related Documentation

- **Nx Cloud Docs:** <https://nx.dev/ci/intro/ci-with-nx>
- **Nx Cloud API:** <https://cloud.nx.app/docs/api>
- **Dashboard Backend:** `server/index.ts`
- **Test Script:** `test-nx-cloud-service.ps1`

## Support

For issues or questions:

1. Check logs: `console.log` statements prefixed with `[NxCloudService]`
2. Run test script: `.\test-nx-cloud-service.ps1`
3. Check database: `sqlite3 server/db/dashboard.db "SELECT * FROM nx_cloud_builds LIMIT 10"`

---

**Last Updated:** 2026-01-17
**Status:** Production Ready ✅
