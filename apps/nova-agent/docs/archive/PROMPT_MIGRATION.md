# Prompt Migration Instructions

**Status**: Completed
**Target**: `src-tauri/src/modules/llm.rs`, `src-tauri/src/modules/agents.rs`
**Priority**: Closed

## Objective

Refactor the Nova Agent Rust backend to stop using hardcoded system prompts and instead fetch them from the Unified Database (`D:\databases\nova_shared.db`).

## Implementation Details (Completed)

1.  **New Module**: `src-tauri/src/modules/prompts.rs`
    *   Handles connection to `D:\databases\nova_shared.db`.
    *   Fetches active prompt content from `prompt_entities` and `prompt_versions`.
    *   Includes hardcoded fallbacks for reliability.

2.  **Refactoring**:
    *   **`src-tauri/src/modules/llm.rs`**: Now uses `prompts::fetch_system_prompt("nova-core-v1")`.
    *   **`src-tauri/src/modules/agents.rs`**: Now uses `prompts::fetch_system_prompt` for:
        *   `nova-core-v1`
        *   `nova-architect-v1`
        *   `nova-engineer-v1`

## Verification

The system is now live.
To update a prompt persona:

```bash
cd D:\PromptEngineer
python prompt_manager.py update "nova-core-v1" "Your new prompt text..." --changelog "Tweaking persona"
```

Restart Nova Agent to see changes.
