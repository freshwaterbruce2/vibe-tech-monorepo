#![allow(dead_code)]
use screenshots::Screen;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub path: String,
    pub timestamp: i64,
    pub width: u32,
    pub height: u32,
}

/// Capture a screenshot of the primary display
#[tauri::command]
pub async fn capture_screenshot() -> Result<ScreenshotResult, String> {
    info!("Capturing screenshot...");

    // Get all screens
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    // Get primary screen (first screen)
    let screen = screens.first().ok_or("No screens found")?;

    // Capture screenshot
    let image = screen
        .capture()
        .map_err(|e| format!("Failed to capture screenshot: {}", e))?;

    // Create screenshots directory in D:\screenshots (data storage)
    let screenshots_dir = PathBuf::from("D:\\screenshots\\nova-agent");
    fs::create_dir_all(&screenshots_dir)
        .map_err(|e| format!("Failed to create screenshot directory: {}", e))?;

    // Generate filename with timestamp
    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("screenshot_{}.png", timestamp);
    let filepath = screenshots_dir.join(&filename);

    // Save screenshot
    image
        .save(&filepath)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    let path_str = filepath
        .to_str()
        .ok_or("Failed to convert path to string")?
        .to_string();

    info!("Screenshot saved: {}", path_str);

    Ok(ScreenshotResult {
        path: path_str,
        timestamp,
        width: image.width(),
        height: image.height(),
    })
}

/// Capture screenshot of specific display
#[tauri::command]
pub async fn capture_screenshot_display(display_index: usize) -> Result<ScreenshotResult, String> {
    info!("Capturing screenshot of display {}...", display_index);

    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    let screen = screens
        .get(display_index)
        .ok_or(format!("Display {} not found", display_index))?;

    let image = screen
        .capture()
        .map_err(|e| format!("Failed to capture screenshot: {}", e))?;

    let screenshots_dir = PathBuf::from("D:\\screenshots\\nova-agent");
    fs::create_dir_all(&screenshots_dir)
        .map_err(|e| format!("Failed to create screenshot directory: {}", e))?;

    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("screenshot_display{}_{}.png", display_index, timestamp);
    let filepath = screenshots_dir.join(&filename);

    image
        .save(&filepath)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    let path_str = filepath
        .to_str()
        .ok_or("Failed to convert path to string")?
        .to_string();

    info!("Screenshot saved: {}", path_str);

    Ok(ScreenshotResult {
        path: path_str,
        timestamp,
        width: image.width(),
        height: image.height(),
    })
}

/// Get list of available displays
#[tauri::command]
pub async fn get_displays() -> Result<Vec<DisplayInfo>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    let displays = screens
        .into_iter()
        .enumerate()
        .map(|(index, screen)| DisplayInfo {
            index,
            name: format!("Display {}", index + 1),
            is_primary: index == 0,
            width: screen.display_info.width,
            height: screen.display_info.height,
        })
        .collect();

    Ok(displays)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub index: usize,
    pub name: String,
    pub is_primary: bool,
    pub width: u32,
    pub height: u32,
}

/// Capture a region of the screen (placeholder - full screen for now)
#[tauri::command]
pub async fn capture_region(
    _x: u32,
    _y: u32,
    _width: u32,
    _height: u32,
) -> Result<ScreenshotResult, String> {
    // For now, just capture full screen
    // Region capture requires additional implementation
    capture_screenshot().await
}

/// List all screenshots in the screenshots directory
#[tauri::command]
pub async fn list_screenshots() -> Result<Vec<ScreenshotFileInfo>, String> {
    let screenshots_dir = PathBuf::from("D:\\screenshots\\nova-agent");

    if !screenshots_dir.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&screenshots_dir)
        .map_err(|e| format!("Failed to read screenshots directory: {}", e))?;

    let mut screenshots = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("png") {
            let metadata =
                fs::metadata(&path).map_err(|e| format!("Failed to read file metadata: {}", e))?;

            let modified = metadata
                .modified()
                .map_err(|e| format!("Failed to get modified time: {}", e))?;

            let timestamp = modified
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| format!("Failed to convert timestamp: {}", e))?
                .as_secs() as i64;

            screenshots.push(ScreenshotFileInfo {
                path: path.to_str().unwrap_or("").to_string(),
                filename: entry.file_name().to_str().unwrap_or("").to_string(),
                timestamp,
                size: metadata.len(),
            });
        }
    }

    // Sort by timestamp (newest first)
    screenshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(screenshots)
}

/// Delete a screenshot file
#[tauri::command]
pub async fn delete_screenshot(path: String) -> Result<(), String> {
    let filepath = PathBuf::from(&path);

    // Verify it's in our screenshots directory
    if !path.starts_with("D:\\screenshots\\nova-agent") {
        return Err("Invalid screenshot path".to_string());
    }

    if !filepath.exists() {
        return Err("Screenshot not found".to_string());
    }

    fs::remove_file(&filepath).map_err(|e| format!("Failed to delete screenshot: {}", e))?;

    info!("Screenshot deleted: {}", path);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotFileInfo {
    pub path: String,
    pub filename: String,
    pub timestamp: i64,
    pub size: u64,
}
