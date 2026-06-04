---
name: antigravity-cli-orchestration
description: Instructs Hermes on how to delegate complex, multi-agent background tasks to the local Google Antigravity (agy) CLI via the workspace IPC bridge.
tags: [antigravity, orchestration, cli, subagents, agy, ipc]
version: 1.0.0
---

# Antigravity CLI Orchestration Skill

This skill defines how Hermes Agent should communicate with the local Antigravity (`agy`) CLI to orchestrate parallel subagents and execute background tasks.

## Environment Requirements
- **IPC Bridge:** Must connect to the local WebSocket IPC bridge on **Port 5004** to dispatch commands.
- **Antigravity CLI:** The `agy` binary is available on the host system.

## Operational Playbook
When you need to delegate a long-running task, parallelize a workload, or run a full repository verification, do not execute it directly. Instead, delegate it to the Antigravity CLI using this sequence:
1. **Target Resolution:** Read the local `active-project.json` lock file to determine the absolute path of the target directory.
2. **Command Formulation:** Construct the `agy agent run` command, ensuring you pass the absolute path to the `--repo` flag.
3. **Dispatch:** Send the command string to the Port 5004 IPC bridge to trigger the subprocess. 
4. **Monitor:** Wait for the bridge to return the `stdout` and `stderr` streams.

## Rules
- **Autonomy Mode:** For tasks with clear, verifiable end states, prepend `/goal` to the prompt so Antigravity executes autonomously to completion without pausing for user approval.
- **Data Policy:** Ensure any command instructing Antigravity to write databases or logs explicitly routes them to `D:\` (e.g., `D:\logs\`, `D:\databases\`). Source code modifications must remain in `C:\dev\`.
- **Command Shorthand:** Always use the `agy` shorthand binary name instead of `antigravity`.

## Example Commands & Procedures

**Example 1: Spawning a background goal via IPC**
To trigger an autonomous verification task, dispatch the following payload through the IPC bridge:
`agy agent run "/goal Link all workspace packages and run a full test verification check across the monorepo." --repo C:\dev\apps\your-app`

**Example 2: Scheduling a recurring cron task**
To set up a background job using Antigravity's cron-style scheduling:
`agy schedule "daily dependency audit and security scan" --cron "0 9 * * *" --repo C:\dev\packages\your-package`
