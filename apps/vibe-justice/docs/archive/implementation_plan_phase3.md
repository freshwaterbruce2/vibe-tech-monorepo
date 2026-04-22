# Phase 3: Local Testing & Automation - Implementation Tasks

**Project:** Vibe-Justice  
**Execution:** Claude Code Agent  
**Duration:** 8-10 hours  
**Goal:** Build comprehensive local testing infrastructure

---

## Task Execution Order

Execute these tasks in sequence. Each task is self-contained and builds on previous work.

---

## TASK 1: Backend Test Infrastructure Setup (30 min)

### 1.1 Create Test Directory Structure

**Create these directories:**

```
backend/tests/
backend/tests/unit/
backend/tests/integration/
backend/tests/fixtures/
```

### 1.2 Create pytest Configuration

**File:** `backend/pytest.ini`

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --strict-markers
    --cov=vibe_justice
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
markers =
    unit: Unit tests (fast, no external dependencies)
    integration: Integration tests (may use database/filesystem)
    slow: Slow tests (may take >5 seconds)
```

**File:** `backend/.coveragerc`

```ini
[run]
source = vibe_justice
omit = 
    */tests/*
    */venv/*
    */.venv/*
    */__pycache__/*

[report]
precision = 2
show_missing = True
skip_covered = False

[html]
directory = htmlcov
```

### 1.3 Create Test Fixtures File

**File:** `backend/tests/conftest.py`

```python
"""Shared pytest fixtures for vibe-justice tests."""
import pytest
import tempfile
import os
from pathlib import Path
from fastapi.testclient import TestClient

@pytest.fixture
def temp_data_dir():
    """Create temporary data directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Set environment variable for tests
        os.environ["VIBE_JUSTICE_DATA_DIR"] = tmpdir
        yield Path(tmpdir)
        # Cleanup
        os.environ.pop("VIBE_JUSTICE_DATA_DIR", None)

@pytest.fixture
def test_api_key():
    """Set test API key."""
    key = "test_api_key_123456"
    os.environ["VIBE_JUSTICE_API_KEY"] = key
    yield key
    os.environ.pop("VIBE_JUSTICE_API_KEY", None)

@pytest.fixture
def api_client(test_api_key, temp_data_dir):
    """FastAPI test client with auth."""
    from main import app
    client = TestClient(app)
    # Add auth header to all requests
    client.headers = {"X-API-Key": test_api_key}
    return client

@pytest.fixture
def sample_case_data():
    """Sample case metadata."""
    return {
        "case_id": "TEST-001",
        "jurisdiction": "SC",
        "case_type": "civil",
        "title": "Test Case vs Test Defendant"
    }
```

### 1.4 Create **init**.py Files

**Create empty files:**

- `backend/tests/__init__.py`
- `backend/tests/unit/__init__.py`
- `backend/tests/integration/__init__.py`

---

## TASK 2: Unit Tests - Authentication (30 min)

**File:** `backend/tests/unit/test_auth.py`

```python
"""Tests for authentication module."""
import pytest
from fastapi import HTTPException
from vibe_justice.utils.auth import require_api_key
import os

@pytest.mark.unit
def test_auth_fail_closed_when_no_key_configured():
    """Verify auth fails closed when API key not set."""
    # Remove env var
    os.environ.pop("VIBE_JUSTICE_API_KEY", None)
    
    with pytest.raises(HTTPException) as exc_info:
        require_api_key("any_key")
    
    assert exc_info.value.status_code == 500
    assert "not set" in exc_info.value.detail.lower()

@pytest.mark.unit
def test_auth_rejects_wrong_key(test_api_key):
    """Verify auth rejects incorrect API key."""
    with pytest.raises(HTTPException) as exc_info:
        require_api_key("wrong_key_123")
    
    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()

@pytest.mark.unit
def test_auth_accepts_correct_key(test_api_key):
    """Verify auth accepts correct API key."""
    result = require_api_key(test_api_key)
    assert result == test_api_key

@pytest.mark.unit
def test_auth_timing_attack_resistance():
    """Verify auth uses constant-time comparison."""
    import inspect
    from vibe_justice.utils.auth import require_api_key
    
    source = inspect.getsource(require_api_key)
    assert "secrets.compare_digest" in source, "Auth should use timing-safe comparison"
```

---

## TASK 3: Unit Tests - Path Resolution (30 min)

**File:** `backend/tests/unit/test_paths.py`

```python
"""Tests for path resolution module."""
import pytest
from pathlib import Path
import os
from vibe_justice.utils.paths import get_data_directory, get_log_directory

@pytest.mark.unit
def test_data_directory_respects_env_var(temp_data_dir):
    """Verify data directory uses environment variable."""
    result = get_data_directory()
    assert result == temp_data_dir

@pytest.mark.unit
def test_data_directory_uses_d_drive_if_exists():
    """Verify D: drive is preferred when available."""
    os.environ.pop("VIBE_JUSTICE_DATA_DIR", None)
    
    result = get_data_directory()
    
    # If D: exists, should use it
    if Path("D:/").exists():
        assert str(result).startswith("D:")
    else:
        # Otherwise should fallback to user profile
        assert str(result).startswith(str(Path.home()))

@pytest.mark.unit
def test_log_directory_uses_d_drive():
    """Verify logs go to D:/logs/vibe-justice."""
    result = get_log_directory()
    
    if Path("D:/").exists():
        assert result == Path("D:/logs/vibe-justice")

@pytest.mark.unit
def test_paths_are_created_automatically(temp_data_dir):
    """Verify directories are created if missing."""
    from vibe_justice.utils.paths import ensure_directories_exist
    
    ensure_directories_exist()
    
    data_dir = get_data_directory()
    assert data_dir.exists() or data_dir.parent.exists()
```

---

## TASK 4: Unit Tests - File Service (30 min)

**File:** `backend/tests/unit/test_file_service.py`

```python
"""Tests for file service."""
import pytest
from pathlib import Path
from vibe_justice.services.file_service import FileService

@pytest.mark.unit
def test_file_service_saves_file(temp_data_dir):
    """Verify file service saves files correctly."""
    service = FileService(base_path=temp_data_dir / "uploads")
    
    # Create test file
    content = b"Test PDF content"
    filename = "test.pdf"
    
    saved_path = service.save_file(filename, content)
    
    assert saved_path.exists()
    assert saved_path.read_bytes() == content
    assert saved_path.name.startswith("test")
    assert saved_path.suffix == ".pdf"

@pytest.mark.unit
def test_file_service_handles_duplicates(temp_data_dir):
    """Verify file service appends timestamp to duplicates."""
    service = FileService(base_path=temp_data_dir / "uploads")
    
    content = b"Test content"
    filename = "duplicate.pdf"
    
    # Save same filename twice
    path1 = service.save_file(filename, content)
    path2 = service.save_file(filename, content)
    
    # Should have different paths (timestamp appended)
    assert path1 != path2
    assert path1.exists()
    assert path2.exists()

@pytest.mark.unit
def test_file_service_creates_directory(temp_data_dir):
    """Verify file service creates base directory if missing."""
    upload_dir = temp_data_dir / "uploads" / "nested"
    service = FileService(base_path=upload_dir)
    
    service.save_file("test.txt", b"content")
    
    assert upload_dir.exists()
```

---

## TASK 5: Unit Tests - Timestamps (30 min)

**File:** `backend/tests/unit/test_timestamps.py`

```python
"""Tests for UTC timestamp utilities."""
import pytest
from datetime import datetime, timezone

@pytest.mark.unit
def test_utc_timestamps_are_timezone_aware():
    """Verify all timestamps use UTC timezone."""
    from vibe_justice.utils.timestamps import get_utc_now
    
    result = get_utc_now()
    
    assert isinstance(result, datetime)
    assert result.tzinfo is not None
    assert result.tzinfo == timezone.utc

@pytest.mark.unit
def test_naive_datetime_conversion():
    """Verify naive datetimes are converted to UTC."""
    from vibe_justice.utils.timestamps import ensure_utc
    
    naive_dt = datetime(2026, 1, 1, 12, 0, 0)  # No timezone
    
    result = ensure_utc(naive_dt)
    
    assert result.tzinfo == timezone.utc
    assert result.year == 2026
    assert result.month == 1

@pytest.mark.unit
def test_aware_datetime_preserved():
    """Verify aware datetimes are preserved."""
    from vibe_justice.utils.timestamps import ensure_utc
    
    aware_dt = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    
    result = ensure_utc(aware_dt)
    
    assert result == aware_dt
    assert result.tzinfo == timezone.utc
```

---

## TASK 6: Integration Tests - API Endpoints (1 hour)

**File:** `backend/tests/integration/test_api_cases.py`

```python
"""Integration tests for /api/cases endpoints."""
import pytest

@pytest.mark.integration
def test_create_case_success(api_client, sample_case_data, temp_data_dir):
    """Verify case creation endpoint works."""
    response = api_client.post("/api/cases/create", json=sample_case_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == sample_case_data["case_id"]
    
    # Verify case directory created
    case_dir = temp_data_dir / "cases" / sample_case_data["case_id"]
    assert case_dir.exists()

@pytest.mark.integration
def test_create_case_duplicate_rejected(api_client, sample_case_data):
    """Verify duplicate case IDs are rejected."""
    # Create first case
    response1 = api_client.post("/api/cases/create", json=sample_case_data)
    assert response1.status_code == 200
    
    # Try to create duplicate
    response2 = api_client.post("/api/cases/create", json=sample_case_data)
    
    assert response2.status_code == 400
    assert "duplicate" in response2.json()["detail"].lower()

@pytest.mark.integration
def test_list_cases(api_client, sample_case_data):
    """Verify case listing endpoint works."""
    # Create test case
    api_client.post("/api/cases/create", json=sample_case_data)
    
    # List cases
    response = api_client.get("/api/cases/list")
    
    assert response.status_code == 200
    cases = response.json()
    assert isinstance(cases, list)
    assert len(cases) > 0
    assert any(c["case_id"] == sample_case_data["case_id"] for c in cases)

@pytest.mark.integration
def test_case_has_utc_timestamps(api_client, sample_case_data):
    """Verify case timestamps are UTC timezone-aware."""
    response = api_client.post("/api/cases/create", json=sample_case_data)
    
    data = response.json()
    created_at = data.get("created_at")
    
    assert created_at is not None
    # Should have timezone offset (e.g., +00:00 for UTC)
    assert "+00:00" in created_at or "Z" in created_at
```

**File:** `backend/tests/integration/test_api_health.py`

```python
"""Integration tests for health check endpoint."""
import pytest

@pytest.mark.integration
def test_health_check_endpoint(api_client):
    """Verify /api/health endpoint works."""
    response = api_client.get("/api/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "status" in data
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data

@pytest.mark.integration
def test_health_check_no_auth_required(api_client):
    """Verify health check doesn't require authentication."""
    # Remove auth header
    client_no_auth = api_client
    client_no_auth.headers = {}
    
    response = client_no_auth.get("/api/health")
    
    # Should work without auth
    assert response.status_code == 200
```

---

## TASK 7: Frontend Test Configuration (30 min)

**File:** `frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5175',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
```

---

## TASK 8: Frontend E2E Tests (2 hours)

### 8.1 Create Test Directories

**Create:**

- `frontend/tests/e2e/`
- `frontend/tests/fixtures/`

### 8.2 Case Workflow Tests

**File:** `frontend/tests/e2e/case-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Case Management Workflow', () => {
  test('create new case end-to-end', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Click "New Case" button
    await page.click('button:has-text("New Case")');
    
    // Fill case form
    await page.fill('input[name="caseId"]', 'E2E-TEST-001');
    await page.fill('input[name="title"]', 'E2E Test Case');
    await page.selectOption('select[name="caseType"]', 'civil');
    
    // Submit
    await page.click('button:has-text("Create")');
    
    // Wait for success (toast or confirmation)
    await expect(
      page.locator('text=/Case created|Success/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('case appears in sidebar after creation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create case
    await page.click('button:has-text("New Case")');
    await page.fill('input[name="caseId"]', 'E2E-SIDEBAR-001');
    await page.click('button:has-text("Create")');
    
    // Wait and verify case appears in list
    await page.waitForTimeout(1000);
    await expect(
      page.locator('[data-testid="case-list"], .sidebar')
    ).toContainText('E2E-SIDEBAR-001');
  });
});
```

### 8.3 Settings Tests

**File:** `frontend/tests/e2e/settings.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Settings Persistence', () => {
  test('settings persist across reloads', async ({ page }) => {
    await page.goto('/');
    
    // Open settings
    await page.click('[aria-label="Settings"], button:has-text("Settings")');
    
    // Toggle "Show Archived"
    const checkbox = page.locator('input[type="checkbox"][name="showArchived"]');
    await checkbox.check();
    
    // Close settings
    await page.click('button:has-text("Close"), button:has-text("Save")');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Open settings again
    await page.click('[aria-label="Settings"], button:has-text("Settings")');
    
    // Verify setting persisted
    await expect(checkbox).toBeChecked();
  });
});
```

### 8.4 Error Boundary Tests

**File:** `frontend/tests/e2e/error-handling.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('app shows error boundary on crash', async ({ page }) => {
    await page.goto('/');
    
    // This test verifies ErrorBoundary is working
    // In real scenario, this would trigger an actual error
    
    // For now, just verify app loads without crashing
    await expect(page.locator('body')).toBeVisible();
    
    // Check console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should have no console errors on startup
    expect(errors.length).toBe(0);
  });
});
```

---

## TASK 9: PowerShell Test Automation Scripts (1.5 hours)

### 9.1 Backend Test Runner

**File:** `scripts/run-backend-tests.ps1`
