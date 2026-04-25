// Load System Prompt for NOVA Agent × Kimi K2.5
// Updated: January 30, 2026 - Optimized for Kimi K2.5 capabilities

use std::fs;
use tracing::{info, warn};

pub fn load_system_prompt() -> String {
    // Kimi K2.5 optimized prompt - leverages native multimodal, thinking mode, and agentic features
    let prompt_path = r"C:\dev\apps\nova-agent\prompts\nova-kimi-k2.5-v1.md";

    match fs::read_to_string(prompt_path) {
        Ok(content) => {
            info!("✅ Loaded system prompt from: {}", prompt_path);
            content
        }
        Err(e) => {
            warn!(
                "⚠️  Could not load system prompt from {}: {}",
                prompt_path, e
            );
            get_fallback_prompt()
        }
    }
}

/// Alternative: Load from database settings
/// This reads from D:\databases\nova_shared.db settings table
#[allow(dead_code)]
pub fn load_prompt_from_database() -> Result<String, String> {
    use rusqlite::Connection;

    let db_path = r"D:\databases\nova_shared.db";

    let conn = Connection::open(db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Get the prompt file path from settings
    let prompt_path: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'nova_system_prompt_path'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to read prompt path from settings: {}", e))?;

    // Read the actual prompt file
    fs::read_to_string(&prompt_path)
        .map_err(|e| format!("Failed to read prompt file {}: {}", prompt_path, e))
}

/// Fallback prompt if system prompt cannot be loaded
fn get_fallback_prompt() -> String {
    r#"You are NOVA (Neural Omnipresent Virtual Assistant), a local-first AI assistant for Windows 11 development.

CRITICAL: When user requests file modifications:
1. FIRST: Call the write_file tool
2. WAIT: Receive tool confirmation
3. THEN: Tell user what you did

NEVER claim you wrote files without actually calling write_file.
NEVER say "✅ Done" without tool confirmation.
ALWAYS include the tool result (line count, file path) in your response.

If you cannot execute a tool, say so clearly and provide the code for manual application."#.to_string()
}

/// Tauri command to get the current system prompt (for frontend display/debugging)
#[tauri::command]
pub fn get_system_prompt() -> String {
    load_system_prompt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_system_prompt() {
        let prompt = load_system_prompt();
        assert!(!prompt.is_empty(), "Prompt should not be empty");
    }
}
