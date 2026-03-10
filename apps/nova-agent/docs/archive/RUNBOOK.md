# Nova Agent Runbook

## Environment Setup

1. Ensure the `D:\` drive is available and writable.
    - Required paths:
        - `D:\databases` (will be created if missing)
        - `D:\trading_data`
        - `D:\trading_logs`
2. Create/Check `.env` file in `apps/nova-agent`:
    - `DEEPSEEK_API_KEY`: Required for production builds.
    - `DATABASE_PATH`: Must be on D:\ drive (default: `D:\databases`).
    - `WORKSPACE_ROOT`: Defaults to `C:\dev`.

## Starting the Application

1. **Development**:

    ```bash
    cd apps/nova-agent
    pnpm dev
    ```

    - Check terminal for "Nova Agent development server is starting up".
    - Check `db_init_success` and `db_health_ok` logs.

2. **Production**:

    ```bash
    cd apps/nova-agent
    pnpm tauri build
    ```

    - Executable location: `src-tauri/target/release/nova-agent.exe`
    - Run with `DEEPSEEK_API_KEY` set in the environment.

## Verification Steps

### 1. Database & Persistence

- **Check**: Navigate to `D:\databases`.
- **Verify**: Files `agent_tasks.db`, `agent_learning.db`, `nova_activity.db` are present.
- **Verify**: WAL files (`.db-wal`, `.db-shm`) appear when the agent is running.

### 2. UI Health Indicators

- **Dashboard**:
  - "System Load": Optimal/Good.
  - "AI Model Status": Active (Green).
  - "Quick Actions": Shows "Next Steps" populated from Guidance engine.
- **Context Guide** (`/context-guide`):
  - **Bridge Status**: "Connected" (Green).
  - **Sync**: Click "Sync Now" - should log activity and refresh guidance.

### 3. Security Checks

- Try to creating a project with a path outside `C:\dev` or `D:\` (e.g., `C:\Users\Public`).
- **Expectation**: Operation blocked with "Access denied" error log.

## Troubleshooting

- **Crash on Start**:
  - "Database path must be on D:\ drive": Check `DATABASE_PATH` env var.
  - "DEEPSEEK_API_KEY is required": Set the API key in `.env` or system environment.
- **Tests Failing**:
  - "Database path must be on D:\ drive": Unit tests mock this check, but integration tests might need D:\ access.
- **Bridge Not Connecting**:
  - Check if port 5004 is in use.
  - Verify `DEEPCODE_WS_URL` in `.env`.
