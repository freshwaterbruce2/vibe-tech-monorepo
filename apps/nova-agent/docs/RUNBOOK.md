# Nova Agent Runbook (Production)

## 1. Environment Setup

- ensure D:\databases exists
- ensure DEEPSEEK_API_KEY is set in .env

## 2. Startup Sequence

1. Start IPC Bridge (backend/ipc-bridge)
2. Start Desktop Commander (apps/desktop-commander-v3)
3. Start Nova Agent (apps/nova-agent)

## 3. Verification

- Check Context Guide for Green 'Connected' status
- tail logs at D:\logs\nova.log (if configured)
