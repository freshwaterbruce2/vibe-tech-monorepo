## Nova Agent Orchestration Harness & Desktop Hands

This document describes how Nova Agent can use the shared orchestration harness and
the desktop "hands" MCP server to drive complex, multi-tool workflows without
overloading the model context.

### Components

- `C:\\dev\\tools\\claude_orchestration_harness.py`
  - Reusable Python module that wires:
    - Tool Search Tool (`tool_search_tool_regex_20251119`)
    - Programmatic Tool Calling (`code_execution_20250825`)
    - Tool Use Examples (via `input_examples` on tool definitions)
  - Provides a `ClaudeOrchestrationHarness` class that:
    - Registers tools (including MCP-backed tools).
    - Runs multi-step conversations with tool_use and server_tool_use blocks.
    - Delegates programmatic tool calls to a `CodeExecutionRuntime`.

- `C:\\dev\\tools\\deepseek_hands.py`
  - MCP server (`desktop-hands-v1`) that exposes desktop control tools:
    - `take_screenshot` – returns base64 PNG of the current desktop.
    - `mouse_action` – move/click/double_click/drag at (x, y).
    - `keyboard_type` – type text or press a specific key.
  - Runs over stdio and is registered in the root `.mcp.json` as `desktop-hands`.

### MCP Configuration

The root `.mcp.json` now includes:

```json
{
  "mcpServers": {
    "desktop-hands": {
      "type": "stdio",
      "command": "python",
      "args": [
        "C:\\\\dev\\\\tools\\\\deepseek_hands.py"
      ]
    }
  }
}
```

Any MCP-aware client (Claude Desktop, DeepSeek Native, Codex CLI, or future Nova
MCP clients) can now invoke `desktop-hands` tools.

### Using the Orchestration Harness

The harness is designed to be used by higher-level services that want Claude to:

1. Discover tools on demand via Tool Search Tool.
2. Orchestrate multiple tools and MCP servers in a single workflow.
3. Use Programmatic Tool Calling for large or multi-step operations.

Example sketch (not wired into Tauri directly):

```python
from tools.claude_orchestration_harness import ClaudeOrchestrationHarness, HarnessConfig


def make_nova_orchestration_harness() -> ClaudeOrchestrationHarness:
  cfg = HarnessConfig(
    system_prompt=(
      "You are Nova's orchestration brain. Use tool search to discover tools "
      "across MCP servers. Use code_execution for multi-step or large-data "
      "workflows, and prefer summarizing results instead of dumping raw data."
    )
  )
  harness = ClaudeOrchestrationHarness(config=cfg)

  # MCP-backed desktop tools can be registered here by calling into an MCP client.
  # The handlers should enforce Nova's D:\\ storage rules and safety constraints.

  return harness
```

At this stage, the orchestration harness and desktop-hands server are **available**
for Nova to use, but Nova's Rust/Tauri application continues to call DeepSeek
directly via `src-tauri/src/modules/llm.rs`. Linking the harness into the Tauri
runtime is an explicitly separate step that should be done with care, e.g. by:

- Adding a Tauri command that proxies orchestration requests to a Python sidecar.
- Or using an MCP client within Nova to talk to the `desktop-hands` server.

### Storage & Safety

- The `desktop-hands` server does not persist any data to disk by default; it
  operates entirely in memory for screenshots.
- If future extensions add logging or state, they must write to:
  - `D:\\logs` for logs.
  - `D:\\databases` or `D:\\data` for any persisted state.

This keeps Nova compliant with the global D:\\ storage mandate while enabling
rich, cross-tool orchestration via MCP.

