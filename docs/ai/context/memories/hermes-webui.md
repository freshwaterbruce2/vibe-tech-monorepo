# Hermes WebUI Context and Bootstrapping

Last Updated: 2026-06-04
Enforcement: RECOMMENDED
Scope: Hermes integration and client-agent workflows

## Overview

The `nesquena/hermes-webui` repository provides a robust, local browser-based graphical interface for the Hermes system. It is not strictly a headless CLI tool. 

## Bootstrapping Guide

To get the WebUI running locally, follow these steps:

1. **Clone the Repository**:
   Clone the WebUI project into your tools directory:
   ```powershell
   cd C:\dev\tools
   git clone https://github.com/nesquena/hermes-webui.git
   ```

2. **Isolated Python Environment**:
   Set up a virtual environment and install dependencies:
   ```powershell
   cd C:\dev\tools\hermes-webui
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. **Launch the Native Start Script**:
   Execute the start script:
   ```powershell
   powershell -File .\start.ps1
   ```

The script will automatically detect the active Hermes Agent installation, spin up a local web server, and launch the dark-themed dashboard in the default browser. CLI and GUI operations reflect immediately across both interfaces.

## Robustness & Fallback Design Pattern

Frontends and bridge APIs consuming output payloads from subagents (e.g. branch creation, repository worktrees) must expect potential schema mismatches or missing fields due to agent payload fragility:

- **Strict Validation**: Mandate required schema keys (e.g. `branchName`) in system prompts.
- **Self-Healing Fallbacks**: If the agent payload fails to return the required state variable, implement fallback mechanisms (such as executing `git worktree list` via the host system) to discover the state dynamically.
