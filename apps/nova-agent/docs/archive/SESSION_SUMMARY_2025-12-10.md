# Nova Agent – Session Summary (2025-12-10)

## Scope

This session focused on integrating a reusable orchestration layer and a desktop
“hands” MCP server into the NovaAgent ecosystem on Windows 11, without breaking
the existing Rust/Tauri DeepSeek integration.

## Key Additions

- **Desktop Hands MCP Server**
  - File: `C:\dev\tools\deepseek_hands.py`
  - Server name: `desktop-hands-v1`
  - Tools:
    - `take_screenshot` – returns base64 PNG of current desktop (in memory).
    - `mouse_action` – move / click / double_click / drag at (x, y).
    - `keyboard_type` – type text or press a key (e.g., `enter`, `esc`).
  - Registered in `C:\dev\.mcp.json` as:
    - `"desktop-hands": { "type": "stdio", "command": "python", "args": ["C:\\dev\\tools\\deepseek_hands.py"] }`

- **Claude Orchestration Harness**
  - File: `C:\dev\tools\claude_orchestration_harness.py`
  - Provides `ClaudeOrchestrationHarness` + `HarnessConfig`:
    - Preloads Tool Search Tool (`tool_search_tool_regex_20251119`).
    - Preloads Programmatic Tool Calling (`code_execution_20250825`).
    - `register_tool(...)` supports `defer_loading`, `allowed_callers`, and `input_examples`.
    - `run_conversation(...)` runs a multi-step tool loop handling `tool_use` and `server_tool_use`.

- **Nova-Oriented Orchestrator Sidecar**
  - File: `C:\dev\tools\nova_orchestrator.py`
  - Behavior:
    - CLI entry: `python nova_orchestrator.py "<prompt>"`.
    - Uses `ClaudeOrchestrationHarness` with a Nova-focused system prompt.
    - Currently returns the text-only answer from Claude; no additional tools are registered yet.

## NovaAgent Backend Integration

- **New Orchestrator Module**
  - File: `apps/nova-agent/src-tauri/src/modules/orchestrator.rs`
  - Tauri command: `orchestrate_desktop_action(prompt: String) -> Result<String, String>`
    - Spawns: `python C:\dev\tools\nova_orchestrator.py "<prompt>"`.
    - Captures stdout/stderr and returns the result to the frontend.

- **Module Registration**
  - File: `apps/nova-agent/src-tauri/src/modules/mod.rs`
  - Added:
    - `pub mod orchestrator;`

- **Tauri Wiring**
  - File: `apps/nova-agent/src-tauri/src/main.rs`
  - Imports orchestrator module via:
    - `use modules::{ ..., orchestrator, ... };`
  - Registers `orchestrator::orchestrate_desktop_action` in `invoke_handler` alongside existing commands.

## Documentation

- File: `apps/nova-agent/docs/ORCHESTRATION_HARNESS.md`
  - Describes:
    - The orchestration harness and desktop-hands server.
    - How they are discovered via `.mcp.json`.
    - How Nova can delegate complex workflows to a Python sidecar using the harness.

## Next Steps (for future sessions)

1. **Register Tools in the Harness**
   - Extend `nova_orchestrator.py` to register MCP-backed tools (e.g., wrappers that call `desktop-hands`, `filesystem`, `sqlite`).
   - Optionally implement a `CodeExecutionRuntime` to fully leverage Programmatic Tool Calling.

2. **Frontend Hook-Up**
   - Add a UI surface in the NovaAgent React frontend that calls the `orchestrate_desktop_action` Tauri command for “guided desktop actions” or “Nova Hands” flows.

3. **Python Environment & Keys**
   - Ensure `python` is on PATH and `anthropic` (or DeepSeek) SDK is installed.
   - Configure API keys (`ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY`) in the environment used by `nova_orchestrator.py`.

4. **Safety & D:\\ Compliance**
   - If adding logging or state to any new component, ensure all persistent data goes to:
     - `D:\logs`, `D:\databases`, or `D:\data` in accordance with repo storage rules.

This summary should be enough to quickly re-orient on what was added and where to continue tomorrow.

