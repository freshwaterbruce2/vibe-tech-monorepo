use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayDimensions {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseAction {
    pub action: String, // "move", "click", "right_click", "double_click", "drag_to"
    pub x: u32,         // normalized coordinate 0-999
    pub y: u32,         // normalized coordinate 0-999
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardAction {
    pub action: String, // "type", "press_key", "hotkey"
    pub text: Option<String>,
    pub key: Option<String>,
    pub modifiers: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub title: String,
    pub process_name: String,
    pub pid: u32,
    pub rect: Option<WindowRect>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultimodalMessage {
    pub role: String,
    pub text: String,
    pub image_base64: Option<String>,
}
