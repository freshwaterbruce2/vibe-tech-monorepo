# Nx Cloud Service Integration Guide

**Quick Reference:** How to add Nx Cloud endpoints to `server/index.ts`

## Step 1: Import the Service

Add to the imports section of `server/index.ts`:

```typescript
import {
  getNxCloudStatus,
  getNxCloudBuilds,
  getNxCloudPerformance,
} from './services/nxCloudService.js';
```

## Step 2: Add Endpoints

Add these three endpoints to `server/index.ts`:

```typescript
// Nx Cloud Status
app.get('/api/nx-cloud/status', async (req, res) => {
  try {
    const status = await getNxCloudStatus();
    res.json(status);
  } catch (error: any) {
    console.error('[API] Nx Cloud status failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Nx Cloud status' });
  }
});

// Nx Cloud Builds
app.get('/api/nx-cloud/builds', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const builds = await getNxCloudBuilds(days);
    res.json(builds);
  } catch (error: any) {
    console.error('[API] Nx Cloud builds failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Nx Cloud builds' });
  }
});

// Nx Cloud Performance
app.get('/api/nx-cloud/performance', async (req, res) => {
  try {
    const performance = await getNxCloudPerformance();
    res.json(performance);
  } catch (error: any) {
    console.error('[API] Nx Cloud performance failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Nx Cloud performance' });
  }
});
```

## Step 3: Update Health Check (Optional)

Add Nx Cloud to the health check response:

```typescript
app.get('/api/health', async (req, res) => {
  const nxCloudStatus = await getNxCloudStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      workspace: 'active',
      trading: 'active',
      services: 'active',
      databases: 'active',
      nxCloud: nxCloudStatus.connected ? 'active' : 'degraded',
    },
  });
});
```

## Complete Example

Here's where to place the endpoints in `server/index.ts`:

```typescript
// ... existing imports
import {
  getNxCloudStatus,
  getNxCloudBuilds,
  getNxCloudPerformance,
} from './services/nxCloudService.js';

// ... existing middleware

// Health check
app.get('/api/health', async (req, res) => {
  // ... existing health check
});

// ... existing endpoints (workspace, trading, services, databases)

// ============================================================================
// Nx Cloud Endpoints (NEW)
// ============================================================================

// Nx Cloud connection status
app.get('/api/nx-cloud/status', async (req, res) => {
  try {
    const status = await getNxCloudStatus();
    res.json(status);
  } catch (error: any) {
    console.error('[API] Nx Cloud status failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Nx Cloud status' });
  }
});

// Nx Cloud recent builds
app.get('/api/nx-cloud/builds', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const builds = await getNxCloudBuilds(days);
    res.json(builds);
  } catch (error: any) {
    console.error('[API] Nx Cloud builds failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Nx Cloud builds' });
  }
});

// Nx Cloud performance metrics
app.get('/api/nx-cloud/performance', async (req, res) => {
  try {
    const performance = await getNxCloudPerformance();
    res.json(performance);
  } catch (error: any) {
    console.error('[API] Nx Cloud performance failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Nx Cloud performance' });
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`[Server] Monorepo Dashboard Backend running on http://localhost:${PORT}`);
});
```

## Testing After Integration

1. **Start the backend:**

   ```bash
   pnpm --filter monorepo-dashboard dev:server
   ```

2. **Run the test script:**

   ```bash
   .\test-nx-cloud-service.ps1
   ```

3. **Manual tests:**

   ```bash
   # Status
   curl http://localhost:5177/api/nx-cloud/status

   # Builds
   curl http://localhost:5177/api/nx-cloud/builds?days=7

   # Performance
   curl http://localhost:5177/api/nx-cloud/performance
   ```

## Environment Setup

Before testing, optionally set your Nx Cloud access token:

```powershell
# PowerShell
$env:NX_CLOUD_ACCESS_TOKEN = "your-token-here"

# Then restart the server
pnpm --filter monorepo-dashboard dev:server
```

**Note:** The service works without the token (falls back to local cache), but provides limited data.

## Expected Responses

### With Token (Full Data)

```json
{
  "connected": true,
  "authenticationRequired": false,
  "buildsInDatabase": 42
}
```

### Without Token (Fallback Mode)

```json
{
  "connected": false,
  "authenticationRequired": true,
  "buildsInDatabase": 10,
  "error": "NX_CLOUD_ACCESS_TOKEN not configured"
}
```

## Files Created

✅ `server/services/nxCloudService.ts` - Main service implementation
✅ `server/db/dashboard.db` - SQLite database (auto-created)
✅ `server/services/NX_CLOUD_SERVICE_README.md` - Complete documentation
✅ `test-nx-cloud-service.ps1` - PowerShell test script
✅ `NX_CLOUD_INTEGRATION_GUIDE.md` - This file

## Next Steps

1. Integrate endpoints into `server/index.ts` (copy code from above)
2. Restart backend server
3. Run test script
4. Create frontend components to display metrics
5. Add to dashboard UI

---

**Ready to integrate!** Just copy the endpoint code into `server/index.ts` when ready.
