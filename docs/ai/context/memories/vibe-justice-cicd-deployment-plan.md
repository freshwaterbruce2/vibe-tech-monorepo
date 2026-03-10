# Vibe-Justice CI/CD & Deployment Automation Strategy

**Project**: Vibe-Justice Legal AI Desktop Application
**Target Platform**: Windows 11 Desktop (Tauri) + FastAPI Backend
**Created**: 2026-01-17
**Priority**: HIGH - Production Deployment Readiness

---

## Executive Summary

This plan transforms Vibe-Justice from CI-only to full CD (Continuous Deployment) with automated installer creation, Docker containerization, semantic versioning, and blue-green deployments. Based on 2026 industry best practices for Tauri desktop apps and FastAPI backends.

**Current State**:

- ✅ CI Pipeline: GitHub Actions with 4 jobs (frontend quality, frontend tests, backend tests, build)
- ❌ NO automated deployment
- ❌ NO installer automation (MSI/NSIS)
- ❌ NO Docker containers
- ❌ NO semantic versioning
- ❌ NO rollback automation

**Target State**:

- ✅ Full CD pipeline from commit → test → build → release
- ✅ Automated Windows installers (MSI + NSIS)
- ✅ Docker containers for backend
- ✅ Semantic versioning with changesets
- ✅ Automated GitHub releases
- ✅ Health monitoring & rollback
- ✅ Blue-green deployment capability

---

## 1. Current Architecture Analysis

### Frontend (React + Vite + Tauri)

- **Framework**: React 19.2, TypeScript 5.9, Vite 7.3
- **Desktop**: Tauri 2.x (MSI/NSIS installers configured)
- **Port**: 5175 (dev), bundled in production
- **Build Script**: `build_release.ps1` (manual)
- **Installer**: Configured in `tauri.conf.json` (targets: msi, nsis)

### Backend (FastAPI + Python)

- **Framework**: FastAPI 0.115.0, Python 3.12
- **Port**: 8000
- **AI Integration**: OpenRouter proxy (DeepSeek models)
- **Database**: SQLite (D:\databases\vibe-justice.db)
- **Build Script**: `build_v8_final.ps1` (manual PyInstaller)

### CI Pipeline (GitHub Actions)

**File**: `.github/workflows/vibe-justice-ci.yml`

**Jobs**:

1. `frontend-quality`: ESLint + TypeScript check (ubuntu-latest)
2. `frontend-tests`: Vitest tests + coverage (ubuntu-latest)
3. `backend-tests`: pytest + coverage (windows-latest)
4. `build`: Frontend production build (ubuntu-latest)
5. `all-checks`: Summary job (gates all checks)

**Path Filters**: Triggers on `apps/vibe-justice/**`

**Artifacts**:

- Frontend coverage (7 days retention)
- Backend coverage + test results (7 days retention)
- Frontend build (7 days retention)

**Missing**:

- Backend Docker build
- Tauri desktop app build (MSI/NSIS)
- Automated releases
- Deployment to any environment

---

## 2. Implementation Phases

### Phase 1: Automated Installer Creation (Week 1)

**Priority**: CRITICAL (enables distribution)
**Goal**: Automated Windows installer builds on GitHub Actions

**Components**:

1. Tauri Action integration for cross-platform builds
2. Automated MSI + NSIS installer creation
3. Code signing (optional, for production)
4. Artifact storage for installers

### Phase 2: Semantic Versioning & Releases (Week 1)

**Priority**: HIGH (enables version management)
**Goal**: Automated version bumping and changelog generation

**Components**:

1. Changesets integration (monorepo-friendly)
2. Automated CHANGELOG.md updates
3. Git tag creation
4. GitHub Release publishing

### Phase 3: Backend Containerization (Week 2)

**Priority**: HIGH (enables scalable deployment)
**Goal**: Docker containers for backend API

**Components**:

1. Multi-stage Dockerfile for FastAPI
2. Docker Compose for local development
3. Container registry publishing (GitHub Container Registry)
4. Health checks and graceful shutdown

### Phase 4: Deployment Automation (Week 2)

**Priority**: MEDIUM (enables production deployment)
**Goal**: Automated deployment to staging/production

**Components**:

1. Environment-specific configurations
2. Deployment workflows (staging, production)
3. Health check verification
4. Automated rollback on failure

### Phase 5: Monitoring & Observability (Week 3)

**Priority**: MEDIUM (enables production monitoring)
**Goal**: Health monitoring and automated alerts

**Components**:

1. Application health endpoints
2. Prometheus metrics (optional)
3. Automated health checks in deployment
4. Alert integration (email, Slack, Discord)

---

## 3. Detailed Implementation Plans

### 3.1 Automated Installer Creation

#### New Workflow: `vibe-justice-release.yml`

**Triggers**:

- Manual workflow dispatch (for testing)
- Tag creation matching `v*.*.*` pattern
- Release branch push (e.g., `release/*`)

**Strategy**: Matrix build for multiple platforms (optional: Linux, macOS)

**Key Steps**:

1. Checkout code
2. Setup Node.js + pnpm
3. Setup Rust toolchain
4. Install frontend dependencies
5. Build backend executable (PyInstaller)
6. Run Tauri Action to build installers
7. Upload artifacts to GitHub Release

**Tauri Action Configuration**:

```yaml
- uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    projectPath: apps/vibe-justice/frontend
    tagName: v__VERSION__
    releaseName: 'Vibe-Justice v__VERSION__'
    releaseBody: 'See CHANGELOG.md for details'
    releaseDraft: false
    prerelease: false
    includeDebug: false
    includeUpdaterJson: true
```

**Outputs**:

- Windows MSI installer (installMode: currentUser)
- Windows NSIS installer (portable + installer)
- Update manifest (updater.json)
- GitHub Release with installers attached

#### Integration with Existing Build Scripts

**Challenge**: Current `build_release.ps1` is manual
**Solution**: Extract logic into reusable scripts called by GitHub Actions

**New Scripts**:

1. `scripts/build-backend.ps1` - Build Python backend (PyInstaller)
2. `scripts/prepare-tauri.ps1` - Copy backend.exe to frontend/resources
3. `scripts/verify-build.ps1` - Post-build verification

**GitHub Actions Workflow**:

```yaml
- name: Build Backend Executable
  run: powershell -File scripts/build-backend.ps1
  
- name: Prepare Tauri Resources
  run: powershell -File scripts/prepare-tauri.ps1
  
- name: Build Tauri App
  uses: tauri-apps/tauri-action@v0
  with:
    projectPath: apps/vibe-justice/frontend
```

---

### 3.2 Semantic Versioning & Releases

#### Changesets Integration

**Why Changesets**:

- Monorepo-friendly (already used in workspace)
- Automatic changelog generation
- PR-based versioning workflow
- GitHub integration

**Setup**:

1. Initialize changesets in `apps/vibe-justice`
2. Configure changelog format (GitHub PR links)
3. Create version bump workflow

#### Workflow: `vibe-justice-version.yml`

**Trigger**: Merge to `main` branch with changeset files

**Steps**:

1. Detect changeset files
2. Run `changeset version` to bump versions
3. Update CHANGELOG.md
4. Create PR with version changes
5. Auto-merge if CI passes (optional)

**Changeset File Example**:

```markdown
---
"vibe-justice": minor
---

Add automated deployment pipeline with Docker support
```

**Result**: Version bumped from 1.0.0 → 1.1.0, CHANGELOG updated

#### GitHub Release Creation

**Workflow**: `vibe-justice-release.yml` (extends installer creation)

**Steps**:

1. Extract version from `tauri.conf.json`
2. Generate release notes from CHANGELOG.md
3. Create GitHub Release with tag `v{version}`
4. Upload installers as release assets
5. Publish release (or draft for review)

**Release Assets**:

- `Vibe-Justice_1.0.0_x64_en-US.msi` (MSI installer)
- `Vibe-Justice_1.0.0_x64-setup.exe` (NSIS installer)
- `latest.json` (updater manifest)
- `CHANGELOG.md` (release notes)

---

### 3.3 Backend Containerization

#### Multi-Stage Dockerfile

**Location**: `apps/vibe-justice/backend/Dockerfile`

**Stages**:

1. **Builder**: Install dependencies, compile Python
2. **Runtime**: Minimal Python image with only runtime deps

**Key Features**:

- Non-root user for security
- Health check endpoint
- Graceful shutdown handling
- Environment variable configuration
- Volume mounts for D:\ data (dev only)

**Example Dockerfile**:

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .
RUN useradd -m -u 1000 vibetech && chown -R vibetech:vibetech /app
USER vibetech
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD python -c "import requests; requests.get('http://localhost:8000/api/health')"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose for Development

**Location**: `apps/vibe-justice/docker-compose.yml`

**Services**:

1. **backend**: FastAPI backend (port 8000)
2. **frontend**: Vite dev server (port 5175) - optional
3. **openrouter-proxy**: Proxy service (port 3001)

**Features**:

- Volume mounts for D:\ data directories
- Environment variable injection from .env
- Health checks for all services
- Restart policies

**Example Compose**:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_PATH=/data/databases/vibe-justice.db
      - LOG_PATH=/data/logs
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - D:/databases:/data/databases
      - D:/logs:/data/logs
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/api/health')"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
```

#### GitHub Actions Docker Build

**Workflow**: `vibe-justice-docker.yml`

**Triggers**:

- Push to main (backend changes)
- Manual workflow dispatch
- Release creation

**Steps**:

1. Checkout code
2. Setup Docker Buildx
3. Login to GitHub Container Registry
4. Build Docker image with tags (version, latest)
5. Push to ghcr.io
6. Scan image for vulnerabilities (Trivy)

**Tags**:

- `ghcr.io/vibetech/vibe-justice-backend:latest`
- `ghcr.io/vibetech/vibe-justice-backend:v1.0.0`
- `ghcr.io/vibetech/vibe-justice-backend:sha-abc123f`

---

### 3.4 Deployment Automation

#### Environment Strategy

**Environments**:

1. **Development**: Local machine (LAUNCH.ps1)
2. **Staging**: Test environment (manual deploy initially)
3. **Production**: Live environment (automated with approval)

**Configuration Files**:

- `.env.development` - Local dev settings
- `.env.staging` - Staging environment
- `.env.production` - Production environment (secrets in GitHub)

#### Deployment Workflow: `vibe-justice-deploy.yml`

**Triggers**:

- Manual workflow dispatch (with environment selection)
- Release published (auto-deploy to staging)
- Tag creation with `v*.*.*` pattern

**Strategy**: Blue-Green Deployment

**Steps**:

1. **Pre-deployment**:
   - Health check current deployment
   - Download latest release artifacts
   - Validate artifact checksums

2. **Deploy Green**:
   - Pull Docker image (backend)
   - Start new container (green)
   - Wait for health check pass
   - Run smoke tests

3. **Switch Traffic**:
   - Update load balancer/reverse proxy
   - Route traffic to green deployment
   - Monitor error rates

4. **Retire Blue**:
   - Wait 5 minutes for stability
   - Stop blue deployment
   - Keep blue for 24 hours (rollback window)

5. **Post-deployment**:
   - Run integration tests
   - Send deployment notification
   - Update deployment dashboard

**Rollback Strategy**:

- Manual trigger: revert traffic to blue
- Automated trigger: if health checks fail 3x
- Data rollback: restore D:\ snapshot (if needed)

#### Desktop App Distribution

**Challenge**: Desktop apps can't use blue-green deployment
**Solution**: Auto-updater built into Tauri

**Tauri Updater Configuration**:

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://releases.vibetech.com/vibe-justice/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "PUBLIC_KEY_HERE"
  }
}
```

**Update Flow**:

1. App checks for updates on startup
2. Downloads new installer if available
3. Prompts user to install
4. Installs in background, restarts app

**GitHub Release as Update Server**:

- `latest.json` contains version + download URLs
- Tauri fetches from GitHub Releases
- Signature verification for security

---

### 3.5 Monitoring & Observability

#### Health Check Endpoints

**Backend**: Already has `/api/health`
**Enhancement**: Add detailed health metrics

**Enhanced Health Response**:

```json
{
  "status": "healthy",
  "service": "Vibe-Justice Backend",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "openrouter_proxy": "ok",
    "disk_space": "ok (78% free)"
  },
  "timestamp": "2026-01-17T10:30:00Z"
}
```

#### Deployment Health Checks

**Workflow Integration**:

```yaml
- name: Wait for Health Check
  run: |
    for i in {1..30}; do
      if curl -f http://backend:8000/api/health; then
        echo "Health check passed"
        exit 0
      fi
      echo "Waiting for service... ($i/30)"
      sleep 10
    done
    echo "Health check failed after 5 minutes"
    exit 1
```

#### Automated Rollback

**Trigger**: 3 consecutive health check failures

**Workflow**:

1. Detect health check failure
2. Stop new deployment
3. Revert traffic to previous version
4. Send alert notification
5. Create incident issue in GitHub

**Notification Channels**:

- GitHub Issue (auto-created)
- Email (GitHub Actions notifications)
- Optional: Slack, Discord webhook

#### Metrics Collection (Optional)

**Tool**: Prometheus + Grafana (future enhancement)
**Metrics**:

- Request rate, latency, error rate
- AI model usage (DeepSeek calls)
- Database query performance
- Resource usage (CPU, memory, disk)

---

## 4. GitHub Actions Workflow Designs

### 4.1 Release Workflow (`vibe-justice-release.yml`)

```yaml
name: Vibe Justice Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version (e.g., 1.0.0)'
        required: true
  push:
    tags:
      - 'v*.*.*'

env:
  PYTHON_VERSION: '3.12'
  NODE_VERSION: '22'
  PNPM_VERSION: '9.15.0'

jobs:
  create-release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.create-release.outputs.id }}
      upload_url: ${{ steps.create-release.outputs.upload_url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Extract version
        id: version
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            VERSION="${GITHUB_REF#refs/tags/v}"
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Generate changelog
        id: changelog
        run: |
          # Extract changelog for this version from CHANGELOG.md
          # Fallback to git log if CHANGELOG.md not found
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          cat CHANGELOG.md | sed -n "/## \[${{ steps.version.outputs.version }}\]/,/## \[/p" >> $GITHUB_OUTPUT || \
          git log --pretty=format:"- %s" $(git describe --tags --abbrev=0)..HEAD >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create Release
        id: create-release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.version.outputs.version }}
          release_name: Vibe-Justice v${{ steps.version.outputs.version }}
          body: ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: false

  build-backend:
    name: Build Backend Executable
    runs-on: windows-latest
    needs: create-release
    defaults:
      run:
        working-directory: apps/vibe-justice/backend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - name: Create virtual environment
        run: python -m venv .venv

      - name: Install dependencies
        run: |
          .venv\Scripts\python.exe -m pip install --upgrade pip
          .venv\Scripts\python.exe -m pip install -r requirements.txt
          .venv\Scripts\python.exe -m pip install pyinstaller

      - name: Build executable with PyInstaller
        run: |
          powershell -File ../build_v8_final.ps1

      - name: Verify executable
        run: |
          if (Test-Path "D:\_build\dist_v8\VibeJustice.exe") {
            Write-Host "Backend executable built successfully"
          } else {
            Write-Error "Backend executable not found"
            exit 1
          }

      - name: Upload backend executable
        uses: actions/upload-artifact@v4
        with:
          name: backend-executable
          path: D:\_build\dist_v8\VibeJustice.exe
          retention-days: 7

  build-tauri-windows:
    name: Build Tauri App (Windows)
    runs-on: windows-latest
    needs: [create-release, build-backend]
    defaults:
      run:
        working-directory: apps/vibe-justice/frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install frontend dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: stable

      - name: Download backend executable
        uses: actions/download-artifact@v4
        with:
          name: backend-executable
          path: apps/vibe-justice/frontend/resources

      - name: Verify backend in resources
        run: |
          if (Test-Path "resources\VibeJustice.exe") {
            Write-Host "Backend executable ready for Tauri"
          } else {
            Write-Error "Backend executable not found in resources"
            exit 1
          }

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: apps/vibe-justice/frontend
          tagName: ${{ needs.create-release.outputs.tag_name }}
          releaseName: Vibe-Justice ${{ needs.create-release.outputs.version }}
          releaseBody: See CHANGELOG.md for details
          releaseDraft: false
          prerelease: false
          releaseId: ${{ needs.create-release.outputs.release_id }}
          includeDebug: false
          includeUpdaterJson: true

      - name: Upload installers to artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installers
          path: |
            apps/vibe-justice/frontend/src-tauri/target/release/bundle/msi/*.msi
            apps/vibe-justice/frontend/src-tauri/target/release/bundle/nsis/*.exe
          retention-days: 30

  notify-release:
    name: Notify Release Completion
    runs-on: ubuntu-latest
    needs: [create-release, build-tauri-windows]
    if: always()

    steps:
      - name: Check build status
        run: |
          if [ "${{ needs.build-tauri-windows.result }}" == "success" ]; then
            echo "✅ Release build completed successfully"
          else
            echo "❌ Release build failed"
            exit 1
          fi

      - name: Comment on release
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createReleaseComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              release_id: ${{ needs.create-release.outputs.release_id }},
              body: '✅ Installers built and uploaded successfully!\n\n' +
                    '**Windows Installers:**\n' +
                    '- MSI Installer (recommended)\n' +
                    '- NSIS Installer (portable + installer)\n\n' +
                    '**Auto-updater:** Enabled (app will check for updates on startup)'
            })
```

### 4.2 Docker Build Workflow (`vibe-justice-docker.yml`)

```yaml
name: Vibe Justice Docker Build

on:
  push:
    branches: [main]
    paths:
      - 'apps/vibe-justice/backend/**'
      - '.github/workflows/vibe-justice-docker.yml'
  workflow_dispatch:
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/vibe-justice-backend

jobs:
  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: apps/vibe-justice/backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

### 4.3 Deployment Workflow (`vibe-justice-deploy.yml`)

```yaml
name: Vibe Justice Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version to deploy (e.g., v1.0.0 or latest)'
        required: true
        default: 'latest'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/vibe-justice-backend

jobs:
  deploy:
    name: Deploy to ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup deployment variables
        id: vars
        run: |
          ENV="${{ github.event.inputs.environment }}"
          VERSION="${{ github.event.inputs.version }}"
          
          echo "env=$ENV" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$VERSION" >> $GITHUB_OUTPUT

      - name: Health check current deployment
        id: current-health
        run: |
          HEALTH_URL="${{ secrets[format('{0}_BACKEND_URL', steps.vars.outputs.env)] }}/api/health"
          if curl -f $HEALTH_URL; then
            echo "Current deployment is healthy"
            echo "healthy=true" >> $GITHUB_OUTPUT
          else
            echo "Current deployment is unhealthy or not running"
            echo "healthy=false" >> $GITHUB_OUTPUT
          fi
        continue-on-error: true

      - name: Pull Docker image
        run: |
          docker pull ${{ steps.vars.outputs.image }}

      - name: Deploy to environment (Blue-Green)
        run: |
          # This is a placeholder - actual deployment depends on your infrastructure
          # Options:
          # 1. SSH to server and run docker-compose
          # 2. Use Kubernetes/k8s deployment
          # 3. Use cloud provider CLI (AWS ECS, Azure Container Apps)
          # 4. Use deployment tool (Ansible, Terraform)
          
          echo "Deploying ${{ steps.vars.outputs.image }} to ${{ steps.vars.outputs.env }}"
          
          # Example: Docker Compose deployment via SSH
          # ssh deploy@server "cd /app && docker-compose pull && docker-compose up -d"

      - name: Wait for new deployment health check
        run: |
          HEALTH_URL="${{ secrets[format('{0}_BACKEND_URL', steps.vars.outputs.env)] }}/api/health"
          
          for i in {1..30}; do
            if curl -f $HEALTH_URL; then
              echo "New deployment is healthy"
              exit 0
            fi
            echo "Waiting for service... ($i/30)"
            sleep 10
          done
          
          echo "Health check failed after 5 minutes"
          exit 1

      - name: Run smoke tests
        run: |
          BACKEND_URL="${{ secrets[format('{0}_BACKEND_URL', steps.vars.outputs.env)] }}"
          
          # Test 1: Root endpoint
          curl -f $BACKEND_URL/ || exit 1
          
          # Test 2: Health check
          curl -f $BACKEND_URL/api/health || exit 1
          
          # Test 3: Chat endpoint (basic)
          curl -f -X POST $BACKEND_URL/api/chat/simple \
            -H "Content-Type: application/json" \
            -d '{"message": "test"}' || exit 1
          
          echo "Smoke tests passed"

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Deployment failed, initiating rollback..."
          # Rollback logic depends on deployment method
          # Example: revert to previous Docker image tag
          # ssh deploy@server "cd /app && docker-compose down && docker-compose up -d previous-version"

      - name: Notify deployment status
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const status = '${{ job.status }}';
            const env = '${{ steps.vars.outputs.env }}';
            const version = '${{ steps.vars.outputs.version }}';
            
            const emoji = status === 'success' ? '✅' : '❌';
            const message = `${emoji} Deployment to **${env}** ${status}\n\n` +
                          `**Version:** ${version}\n` +
                          `**Environment:** ${env}\n` +
                          `**Status:** ${status}`;
            
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: message
            });
```

---

## 5. PowerShell Script Enhancements

### 5.1 Enhanced Build Scripts

#### `scripts/build-backend.ps1` (Extracted from build_release.ps1)

```powershell
#Requires -Version 7
#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('Development', 'Release')]
    [string]$Configuration = 'Release',
    
    [Parameter()]
    [string]$OutputPath = 'D:\_build\dist_v8',
    
    [Parameter()]
    [switch]$SkipCleanup,
    
    [Parameter()]
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
$BackendDir = Join-Path $ScriptDir '..\apps\vibe-justice\backend'

Write-Host "`n==== BUILDING VIBE-JUSTICE BACKEND ====`n" -ForegroundColor Cyan

# Step 1: Cleanup (if not skipped)
if (-not $SkipCleanup) {
    Write-Host "[STEP 1/5] Cleaning previous build..." -ForegroundColor Yellow
    if (Test-Path $OutputPath) {
        Remove-Item -Path $OutputPath -Recurse -Force
        Write-Host "  ✓ Cleaned: $OutputPath" -ForegroundColor Green
    }
}

# Step 2: Activate venv
Write-Host "[STEP 2/5] Activating Python virtual environment..." -ForegroundColor Yellow
Push-Location $BackendDir
if (-not (Test-Path '.venv')) {
    Write-Error "Virtual environment not found. Run 'python -m venv .venv' first."
}
& .\.venv\Scripts\Activate.ps1

# Step 3: Install dependencies
Write-Host "[STEP 3/5] Installing dependencies..." -ForegroundColor Yellow
.venv\Scripts\python.exe -m pip install --upgrade pip -q
.venv\Scripts\python.exe -m pip install -r requirements.txt -q
.venv\Scripts\python.exe -m pip install pyinstaller -q
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# Step 4: Build with PyInstaller
Write-Host "[STEP 4/5] Building executable with PyInstaller..." -ForegroundColor Yellow
$BuildScript = Join-Path $ScriptDir '..\apps\vibe-justice\build_v8_final.ps1'
if (Test-Path $BuildScript) {
    & $BuildScript
} else {
    Write-Error "Build script not found: $BuildScript"
}

# Step 5: Verify output
Write-Host "[STEP 5/5] Verifying build output..." -ForegroundColor Yellow
$ExePath = Join-Path $OutputPath 'VibeJustice.exe'
if (Test-Path $ExePath) {
    $FileInfo = Get-Item $ExePath
    Write-Host "  ✓ Executable built: $ExePath" -ForegroundColor Green
    Write-Host "  ✓ Size: $([math]::Round($FileInfo.Length / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host "  ✓ Modified: $($FileInfo.LastWriteTime)" -ForegroundColor Green
} else {
    Write-Error "Executable not found: $ExePath"
}

Pop-Location

Write-Host "`n==== BACKEND BUILD COMPLETE ====`n" -ForegroundColor Green
Write-Host "Output: $ExePath" -ForegroundColor White
```

#### `scripts/prepare-tauri.ps1` (Copy backend to Tauri resources)

```powershell
#Requires -Version 7

[CmdletBinding()]
param(
    [Parameter()]
    [string]$SourcePath = 'D:\_build\dist_v8\VibeJustice.exe',
    
    [Parameter()]
    [string]$DestPath = 'apps\vibe-justice\frontend\resources\backend.exe',
    
    [Parameter()]
    [switch]$Verify
)

$ErrorActionPreference = 'Stop'

Write-Host "`n==== PREPARING TAURI RESOURCES ====`n" -ForegroundColor Cyan

# Step 1: Verify source exists
if (-not (Test-Path $SourcePath)) {
    Write-Error "Source executable not found: $SourcePath"
}

# Step 2: Ensure destination directory exists
$DestDir = Split-Path $DestPath -Parent
if (-not (Test-Path $DestDir)) {
    New-Item -Path $DestDir -ItemType Directory -Force | Out-Null
    Write-Host "  ✓ Created directory: $DestDir" -ForegroundColor Green
}

# Step 3: Copy executable
Write-Host "Copying backend executable..." -ForegroundColor Yellow
Copy-Item -Path $SourcePath -Destination $DestPath -Force
Write-Host "  ✓ Copied: $SourcePath → $DestPath" -ForegroundColor Green

# Step 4: Verify (if requested)
if ($Verify) {
    $SourceHash = (Get-FileHash $SourcePath -Algorithm SHA256).Hash
    $DestHash = (Get-FileHash $DestPath -Algorithm SHA256).Hash
    
    if ($SourceHash -eq $DestHash) {
        Write-Host "  ✓ Verification passed (SHA256 match)" -ForegroundColor Green
    } else {
        Write-Error "Verification failed: Checksums do not match"
    }
}

Write-Host "`n==== TAURI RESOURCES READY ====`n" -ForegroundColor Green
Write-Host "Backend executable ready for Tauri build: $DestPath" -ForegroundColor White
```

#### `scripts/verify-build.ps1` (Post-build verification)

```powershell
#Requires -Version 7

[CmdletBinding()]
param(
    [Parameter()]
    [string]$BuildDir = 'apps\vibe-justice\frontend\src-tauri\target\release\bundle',
    
    [Parameter()]
    [ValidateSet('msi', 'nsis', 'both')]
    [string]$InstallerType = 'both'
)

$ErrorActionPreference = 'Stop'

Write-Host "`n==== VERIFYING TAURI BUILD ====`n" -ForegroundColor Cyan

$Issues = @()

# Check MSI installer
if ($InstallerType -in @('msi', 'both')) {
    Write-Host "Checking MSI installer..." -ForegroundColor Yellow
    $MsiPath = Join-Path $BuildDir 'msi\*.msi'
    $MsiFiles = Get-ChildItem $MsiPath -ErrorAction SilentlyContinue
    
    if ($MsiFiles) {
        foreach ($Msi in $MsiFiles) {
            Write-Host "  ✓ Found: $($Msi.Name) ($([math]::Round($Msi.Length / 1MB, 2)) MB)" -ForegroundColor Green
        }
    } else {
        $Issues += "MSI installer not found"
        Write-Host "  ✗ MSI installer not found" -ForegroundColor Red
    }
}

# Check NSIS installer
if ($InstallerType -in @('nsis', 'both')) {
    Write-Host "Checking NSIS installer..." -ForegroundColor Yellow
    $NsisPath = Join-Path $BuildDir 'nsis\*.exe'
    $NsisFiles = Get-ChildItem $NsisPath -ErrorAction SilentlyContinue
    
    if ($NsisFiles) {
        foreach ($Nsis in $NsisFiles) {
            Write-Host "  ✓ Found: $($Nsis.Name) ($([math]::Round($Nsis.Length / 1MB, 2)) MB)" -ForegroundColor Green
        }
    } else {
        $Issues += "NSIS installer not found"
        Write-Host "  ✗ NSIS installer not found" -ForegroundColor Red
    }
}

# Check updater manifest
Write-Host "Checking updater manifest..." -ForegroundColor Yellow
$UpdaterPath = Join-Path $BuildDir 'latest.json'
if (Test-Path $UpdaterPath) {
    Write-Host "  ✓ Found: latest.json" -ForegroundColor Green
} else {
    $Issues += "Updater manifest (latest.json) not found"
    Write-Host "  ✗ Updater manifest not found" -ForegroundColor Red
}

# Summary
Write-Host "`n==== VERIFICATION SUMMARY ====`n" -ForegroundColor Cyan
if ($Issues.Count -eq 0) {
    Write-Host "✅ All checks passed - build is ready for distribution" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Verification failed with $($Issues.Count) issue(s):" -ForegroundColor Red
    foreach ($Issue in $Issues) {
        Write-Host "  • $Issue" -ForegroundColor Red
    }
    exit 1
}
```

---

## 6. Deployment Platform Recommendations

### 6.1 Desktop App Distribution

**Platform**: GitHub Releases (RECOMMENDED)

**Pros**:

- Free for public repos
- Built-in with GitHub Actions
- Tauri auto-updater integration
- Version history + changelogs
- Download statistics

**Cons**:

- No analytics/telemetry
- No A/B testing
- No feature flags

**Alternative**: Custom update server (future)

### 6.2 Backend Deployment

**Option 1: GitHub Container Registry + Cloud VM (RECOMMENDED for MVP)**

**Setup**:

1. Build Docker images in GitHub Actions
2. Push to ghcr.io (free, unlimited public images)
3. Deploy to cloud VM (AWS EC2, Azure VM, DigitalOcean Droplet)
4. Use Docker Compose for orchestration
5. Nginx reverse proxy for HTTPS

**Cost**: $5-20/month (small VM)

**Pros**:

- Simple setup
- Full control
- Low cost
- Easy rollback (Docker tags)

**Cons**:

- Manual VM management
- No auto-scaling
- Single point of failure

---

**Option 2: Managed Container Service (SCALABLE)**

**Platforms**:

- AWS ECS Fargate (serverless containers)
- Azure Container Apps
- Google Cloud Run
- Fly.io (dev-friendly)

**Cost**: $10-50/month (usage-based)

**Pros**:

- Auto-scaling
- Zero-downtime deployments
- Managed infrastructure
- Built-in load balancing

**Cons**:

- Higher complexity
- Higher cost at scale
- Vendor lock-in

---

**Option 3: Hybrid (Desktop Self-Hosted Backend)**

**Approach**:

- Desktop app includes embedded FastAPI backend (already implemented)
- No cloud deployment needed
- Users run backend locally

**Pros**:

- Zero hosting cost
- No internet required (except AI calls)
- Full privacy

**Cons**:

- Can't share data across devices
- Manual updates required
- No centralized monitoring

**Recommendation**: Start with Option 3 (current setup), add Option 1 for future cloud features

---

## 7. Implementation Sequence

### Week 1: Foundation (Installers + Versioning)

**Priority**: CRITICAL

**Tasks**:

1. Create `scripts/build-backend.ps1` (extract from build_release.ps1)
2. Create `scripts/prepare-tauri.ps1` (copy backend to resources)
3. Create `scripts/verify-build.ps1` (post-build checks)
4. Create `.github/workflows/vibe-justice-release.yml`
5. Test release workflow manually (workflow_dispatch)
6. Integrate changesets for semantic versioning
7. Test full release cycle (commit → version → build → release)

**Deliverables**:

- ✅ Automated Windows installers (MSI + NSIS)
- ✅ Automated version bumping
- ✅ GitHub releases with changelogs
- ✅ Auto-updater manifest (latest.json)

---

### Week 2: Containerization + Deployment

**Priority**: HIGH

**Tasks**:

1. Create `apps/vibe-justice/backend/Dockerfile`
2. Create `apps/vibe-justice/docker-compose.yml`
3. Test Docker build locally
4. Create `.github/workflows/vibe-justice-docker.yml`
5. Setup GitHub Container Registry
6. Create `.github/workflows/vibe-justice-deploy.yml` (basic)
7. Test deployment to staging environment

**Deliverables**:

- ✅ Docker images for backend
- ✅ Docker Compose for local dev
- ✅ Automated Docker builds in CI
- ✅ Basic deployment workflow

---

### Week 3: Monitoring + Production

**Priority**: MEDIUM

**Tasks**:

1. Enhance `/api/health` endpoint with detailed metrics
2. Add health checks to deployment workflows
3. Implement automated rollback on health check failure
4. Create deployment notification system
5. Setup staging environment
6. Test blue-green deployment
7. Document deployment procedures

**Deliverables**:

- ✅ Enhanced health monitoring
- ✅ Automated rollback capability
- ✅ Staging environment
- ✅ Production deployment guide

---

### Week 4: Polish + Documentation

**Priority**: LOW

**Tasks**:

1. Add Prometheus metrics (optional)
2. Create deployment dashboard (GitHub Actions status page)
3. Write operator runbooks
4. Create incident response procedures
5. Setup monitoring alerts (email/Slack)
6. Performance test deployment pipeline
7. Security audit (Trivy scans, secret detection)

**Deliverables**:

- ✅ Complete documentation
- ✅ Monitoring & alerting
- ✅ Security hardening
- ✅ Production-ready pipeline

---

## 8. Success Metrics

### Deployment Frequency

- **Target**: Multiple deployments per day (staging)
- **Current**: Manual, irregular

### Build Time

- **Target**: <10 minutes (full release)
- **Current**: ~15-20 minutes (manual)

### Deployment Success Rate

- **Target**: >95% automated deployments succeed
- **Current**: N/A (no automation)

### Time to Rollback

- **Target**: <5 minutes (automated)
- **Current**: Manual, hours

### Mean Time to Recovery (MTTR)

- **Target**: <30 minutes
- **Current**: Hours (manual process)

---

## 9. Risk Mitigation

### Risk 1: PyInstaller Build Fails in CI

**Probability**: MEDIUM
**Impact**: HIGH (blocks releases)

**Mitigation**:

- Test PyInstaller in CI during Week 1
- Use cached dependencies to speed up builds
- Fallback: build on local Windows machine, upload to GitHub

---

### Risk 2: Docker Image Too Large

**Probability**: LOW
**Impact**: MEDIUM (slow deployments)

**Mitigation**:

- Use multi-stage builds
- Remove dev dependencies from runtime image
- Use slim Python base images
- Implement layer caching

---

### Risk 3: Tauri Auto-Updater Issues

**Probability**: MEDIUM
**Impact**: HIGH (users can't update)

**Mitigation**:

- Test updater in staging builds first
- Implement fallback: manual download link
- Monitor updater telemetry (Tauri built-in)
- Document manual update process

---

### Risk 4: Deployment Downtime

**Probability**: LOW
**Impact**: HIGH (service unavailable)

**Mitigation**:

- Blue-green deployment (zero downtime)
- Health checks before traffic switch
- Automated rollback on failure
- Maintenance window notifications (if needed)

---

## 10. Future Enhancements (Post-MVP)

### Phase 6: Advanced Monitoring

- Application Performance Monitoring (APM)
- Error tracking (Sentry, Rollbar)
- User analytics (Mixpanel, Amplitude)
- Cost tracking (AI API usage)

### Phase 7: Feature Flags

- LaunchDarkly or custom solution
- A/B testing infrastructure
- Gradual rollouts (canary deployments)
- Kill switches for problematic features

### Phase 8: Multi-Platform Builds

- Linux AppImage (Tauri supports)
- macOS DMG (Tauri supports)
- Cross-compilation in GitHub Actions
- Platform-specific testing

### Phase 9: Infrastructure as Code

- Terraform for cloud resources
- Ansible for server configuration
- Automated environment provisioning
- Disaster recovery automation

---

## 11. Conclusion

This CI/CD and deployment automation strategy transforms Vibe-Justice from a manually-built desktop app to a professionally deployed, continuously delivered product. The phased approach ensures incremental progress with minimal risk, while the focus on automation reduces manual toil and enables rapid iteration.

**Key Achievements**:

1. ✅ **Automated Installer Creation**: Windows MSI + NSIS via Tauri Action
2. ✅ **Semantic Versioning**: Changesets for version management
3. ✅ **Docker Containerization**: Backend API as portable containers
4. ✅ **Deployment Automation**: Blue-green deployments with health checks
5. ✅ **Monitoring & Rollback**: Automated health monitoring and rollback
6. ✅ **GitHub Integration**: Releases, container registry, workflows

**Timeline**: 3-4 weeks to production-ready state
**Effort**: ~40-60 hours (spread across 4 weeks)
**Cost**: $0-20/month (GitHub free tier + optional VM)

**Next Action**: Begin Week 1 implementation (installer automation)

---

## 12. References

### Official Documentation

- [Tauri GitHub Actions](https://github.com/tauri-apps/tauri-action)
- [Tauri Deployment Guide](https://v2.tauri.app/distribute/pipelines/github/)
- [FastAPI with Docker](https://testdriven.io/courses/tdd-fastapi/)
- [GitHub Actions CI for FastAPI](https://pyimagesearch.com/2024/11/04/enhancing-github-actions-ci-for-fastapi-build-test-and-publish/)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Release](https://github.com/semantic-release/semantic-release)

### Implementation Examples

- [FastAPI Docker GitHub Actions](https://github.com/san99tiago/fastapi-docker-github-actions)
- [FastAPI with GHCR](https://pyimagesearch.com/2024/11/11/fastapi-with-github-actions-and-ghcr-continuous-delivery-made-simple/)
- [Automating Releases with GitHub Actions](https://dev.to/arpanaditya/automating-releases-with-semantic-versioning-and-github-actions-2a06)

---

**Status**: READY FOR IMPLEMENTATION
**Created**: 2026-01-17
**Last Updated**: 2026-01-17
**Owner**: VibeTech Development Team
