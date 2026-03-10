# React Query Hooks for Monorepo Dashboard

This directory contains React Query hooks for fetching data from the monorepo dashboard backend API.

## Prerequisites

- `@tanstack/react-query` v5.62.0 (already installed)
- Backend server running on `http://localhost:5177`

## Available Hooks

### Coverage Hooks (`useCoverage.ts`)

#### `useCoverage()`

Fetches current test coverage for all projects.

```tsx
import { useCoverage } from '@/hooks';

function CoverageTab() {
  const { data, isLoading, error } = useCoverage();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map((project) => (
        <div key={project.projectName}>
          <h3>{project.projectName}</h3>
          <p>Coverage: {project.metrics.coveragePercent}%</p>
        </div>
      ))}
    </div>
  );
}
```

#### `useCoverageTrends(days?: number)`

Fetches historical coverage trends.

```tsx
const { data } = useCoverageTrends(30); // Last 30 days
```

#### `useCoverageDetails(projectName: string)`

Fetches detailed coverage metrics for a specific project.

```tsx
const { data } = useCoverageDetails('vibe-code-studio');
```

---

### Bundle Size Hooks (`useBundles.ts`)

#### `useBundleSizes()`

Fetches current bundle sizes for all projects with regression detection.

```tsx
import { useBundleSizes } from '@/hooks';

function BundlesTab() {
  const { data, isLoading } = useBundleSizes();

  return (
    <div>
      {data?.map((bundle) => (
        <div key={bundle.project_name}>
          <h3>{bundle.project_name}</h3>
          <p>Size: {(bundle.total_size / 1024).toFixed(2)} KB</p>
          {bundle.regression && (
            <span className="text-red-500">
              Regression: +{bundle.size_change_percent}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### `useBundleTrends(days?: number)`

Fetches bundle size trends over time.

```tsx
const { data } = useBundleTrends(30);

// data includes:
// - snapshots: Array<{ timestamp, total_size, gzip_size }>
// - average_size: number
// - trend: 'increasing' | 'decreasing' | 'stable'
```

#### `useBundleAnalysis(projectName: string)`

Fetches detailed bundle breakdown with chunk analysis.

```tsx
const { data } = useBundleAnalysis('nova-agent');

// data includes:
// - chunks: Array of all chunks
// - largest_chunks: Top 10 largest chunks
// - compression_ratio: Gzip efficiency
```

---

### Nx Cloud Hooks (`useNxCloud.ts`)

#### `useNxCloudStatus()`

Fetches Nx Cloud connection status.

```tsx
import { useNxCloudStatus } from '@/hooks';

function NxCloudStatus() {
  const { data } = useNxCloudStatus();

  return (
    <div>
      <p>Connected: {data?.connected ? 'Yes' : 'No'}</p>
      <p>Builds in DB: {data?.buildsInDatabase}</p>
      {data?.error && <p className="text-red-500">{data.error}</p>}
    </div>
  );
}
```

#### `useNxCloudBuilds(limit?: number)`

Fetches recent CI/CD builds.

```tsx
const { data } = useNxCloudBuilds(20); // Last 20 builds

// data includes:
// - id, timestamp, branch
// - status: 'success' | 'failure' | 'running'
// - durationMs, cacheHitRate
// - tasksExecuted, tasksCached
```

#### `useNxCloudPerformance(days?: number)`

Fetches performance metrics over time.

```tsx
const { data } = useNxCloudPerformance(7);

// data includes:
// - avgBuildTimeMs, avgCacheHitRate
// - totalBuilds, successRate
// - fastestBuildMs, slowestBuildMs
```

---

### Config Drift & Vulnerabilities (`useConfigDrift.ts`)

#### `useVulnerabilities()`

Fetches npm security vulnerabilities.

```tsx
import { useVulnerabilities } from '@/hooks';

function SecurityTab() {
  const { data, isLoading } = useVulnerabilities();

  return (
    <div>
      <h2>Vulnerabilities: {data?.totalVulnerabilities}</h2>
      <div>
        <span>Critical: {data?.critical}</span>
        <span>High: {data?.high}</span>
        <span>Moderate: {data?.moderate}</span>
        <span>Low: {data?.low}</span>
      </div>
      <ul>
        {data?.vulnerabilities.map((vuln, i) => (
          <li key={i}>
            <strong>{vuln.name}</strong> ({vuln.severity})
            <p>{vuln.description}</p>
            <p>Fix: Upgrade to {vuln.fixedVersion}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### `useConfigDrift()`

Checks configuration alignment across projects.

**Updated to use React Query** - provides better caching and automatic refetching.

```tsx
const { drifts, loading, error, metrics, refetch, isRefetching } = useConfigDrift();

console.log(metrics);
// {
//   totalConfigs: 5,
//   totalDrifts: 12,
//   totalAligned: 38,
//   configsWithDrift: 3
// }

// Manual refetch
<button onClick={() => refetch()}>Refresh</button>
```

#### `useConfigFileDrift(filename: string)`

Checks drift for a specific config file.

```tsx
const { data } = useConfigFileDrift('tsconfig.json');
```

---

## Configuration

All hooks use these settings:

- **API Base URL**: `http://localhost:5177/api`
- **Refetch Intervals**: 1-5 minutes (based on data volatility)
- **Stale Time**: 30 seconds - 3 minutes
- **Automatic Background Refetching**: Enabled

### Refetch Intervals

| Hook | Interval | Rationale |
|------|----------|-----------|
| `useCoverage()` | 2 minutes | Coverage changes after test runs |
| `useCoverageTrends()` | 5 minutes | Historical data changes slowly |
| `useBundleSizes()` | 3 minutes | Bundle sizes change after builds |
| `useNxCloudStatus()` | 1 minute | Real-time CI/CD status |
| `useNxCloudBuilds()` | 2 minutes | New builds appear frequently |
| `useVulnerabilities()` | 5 minutes | Vulnerabilities rarely change |
| `useConfigDrift()` | 3 minutes | Config changes are infrequent |

---

## Error Handling

All hooks return `error` from `useQuery`:

```tsx
const { data, error, isLoading } = useCoverage();

if (error) {
  return <div>Error: {error.message}</div>;
}
```

---

## Manual Refetching

All hooks support manual refetching:

```tsx
const { data, refetch, isRefetching } = useCoverage();

<button onClick={() => refetch()} disabled={isRefetching}>
  {isRefetching ? 'Refreshing...' : 'Refresh Coverage'}
</button>
```

---

## TypeScript Types

All hooks are fully typed. Import types if needed:

```tsx
import type {
  ProjectCoverage,
  CoverageTrend,
  BundleLatest,
  NxCloudBuild,
  Vulnerability
} from '@/hooks/useCoverage'; // Types are exported from each hook file
```

---

## Migration from useState/useEffect

If you have existing hooks using `useState` + `useEffect`:

**Before:**

```tsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch('/api/endpoint');
      setData(await res.json());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);
```

**After:**

```tsx
const { data, isLoading: loading, error } = useCustomHook();
```

Benefits:

- Automatic caching
- Background refetching
- Less boilerplate
- Better error handling
- Automatic request deduplication

---

## Development

### Running Backend

```bash
cd apps/monorepo-dashboard
pnpm nx dev monorepo-dashboard-backend
```

Backend will run on `http://localhost:5177`

### Testing Hooks

Use React Query Devtools in development:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

---

## Related Files

- **Backend API**: `apps/monorepo-dashboard/server/index.ts`
- **Services**: `apps/monorepo-dashboard/server/services/*.ts`
- **Types**: Defined inline in each hook file

---

Last Updated: 2026-01-18
