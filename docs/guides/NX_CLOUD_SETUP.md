# Nx Cloud Setup Guide

## Current Status

- ✅ Nx Cloud ID configured: `68edca82f2b9a8eee56b978f`
- ⚠️ Access token needed for full functionality

## Setup Steps

### 1. Get Nx Cloud Access Token

Visit <https://cloud.nx.app> and:

1. Sign up or log in to your Nx Cloud account
2. Create a workspace or connect to existing workspace
3. Copy your access token from the dashboard

### 2. Configure Access Token

Create `.env.local` file in the root directory:

```bash
# Nx Cloud Configuration
NX_CLOUD_ACCESS_TOKEN=your_token_here
```

Or set as environment variable:

```bash
# Windows (PowerShell)
$env:NX_CLOUD_ACCESS_TOKEN="your_token_here"

# Windows (CMD)
set NX_CLOUD_ACCESS_TOKEN=your_token_here

# Linux/Mac
export NX_CLOUD_ACCESS_TOKEN="your_token_here"
```

### 3. Verify Configuration

```bash
# Check if Nx Cloud is connected
pnpm nx show

# Test distributed caching
pnpm nx run vibe-tutor:build
pnpm nx run vibe-tutor:build # Should be cached instantly
```

## Benefits

- **Distributed Cache**: Share build artifacts across machines
- **Remote Caching**: CI/CD uses same cache as local development
- **Faster Builds**: 50-90% reduction in CI/CD time
- **Analytics**: Build performance insights and bottleneck detection

## Usage in CI/CD

### GitHub Actions Example

```yaml
- name: Setup Nx Cloud
  env:
    NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
  run: |
    pnpm nx affected --target=build --base=origin/main
```

### Environment Variables for CI

- `NX_CLOUD_ACCESS_TOKEN`: Required for authentication
- `NX_CLOUD_DISTRIBUTED_EXECUTION`: Enable distributed task execution
- `NX_CLOUD_DISTRIBUTED_EXECUTION_AGENT_COUNT`: Number of agents (default: 3)

## Monitoring

Visit <https://nx.app/orgs/68edca82f2b9a8eee56b978f> to view:

- Build performance metrics
- Cache hit rates
- Task execution timeline
- Distributed execution logs

## Troubleshooting

- Clear local cache: `pnpm nx reset`
- Disable cloud temporarily: `NX_CLOUD_ENABLED=false pnpm nx build`
- Check connection: `npx nx-cloud validate`
