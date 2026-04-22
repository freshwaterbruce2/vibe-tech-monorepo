# Vibe-Justice Testing Guide

This guide explains how to run tests locally for the Vibe-Justice application.

## 1. Backend Testing (pytest)

Backend tests focus on service logic and API endpoints. We use `pytest` with extensive mocking for external services like ChromaDB and AI providers.

### Running Tests

```powershell
cd backend
$env:PYTHONPATH="."
python -m pytest vibe_justice/tests/
```

### Key Fixtures

- `tmp_data_dir`: Provides isolated storage for each test.
- `file_service`: Pre-configured instance of FileService.
- `extraction_service`: Pre-configured instance of ExtractionService.

---

## 2. Frontend Testing (Playwright)

End-to-end tests focus on user flows and UI stability.

### Prerequisites

Ensure the development server is running or configured in `playwright.config.ts`.

### Running Tests

```powershell
cd frontend
npx playwright test
```

---

## 3. Automation Scripts

We provide PowerShell scripts for common tasks:

- `./run-all-tests.ps1`: Runs both backend and frontend suites.
- `./backup-data.ps1`: Backs up local application data from `D:\`.
