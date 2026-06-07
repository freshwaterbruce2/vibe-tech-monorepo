use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub fn get_affected_graph() -> Result<String, String> {
    // We execute `npx nx graph --file=temp_graph.json`
    // Then read the file and return the JSON

    let temp_file = "temp_graph.json";

    // Ensure we are in C:\dev
    let _ = Command::new("cmd")
        .args(["/C", "pnpm", "nx", "graph", "--file", temp_file])
        .current_dir("C:\\dev")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to execute nx graph: {}", e))?;

    let path = std::path::Path::new("C:\\dev").join(temp_file);
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read graph output: {}", e))?;

    // Clean up
    let _ = std::fs::remove_file(&path);

    // The content is a JSON string. We can just return it directly directly to the frontend
    // as a string. The frontend can JSON.parse it.
    Ok(content)
}

#[tauri::command]
pub fn run_affected_build() -> Result<u32, String> {
    // Spawn task in background
    let child = Command::new("cmd")
        .args(["/C", "pnpm", "nx", "affected", "--target=build"])
        .current_dir("C:\\dev")
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to execute nx affected build: {}", e))?;

    Ok(child.id())
}
