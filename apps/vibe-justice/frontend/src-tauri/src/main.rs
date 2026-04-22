// Vibe-Justice Desktop Application
// Tauri 2.x entry point - Windows 11 only

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    vibe_justice_lib::run()
}
