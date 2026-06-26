use std::fs;
use std::io::Write;
use std::path::PathBuf;
use screenshots::Screen;
use tracing::info;

use super::types::DisplayDimensions;

pub async fn get_primary_display_dimensions() -> Result<(u32, u32), String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    let screen = screens.first().ok_or("No screens found".to_string())?;
    Ok((screen.display_info.width, screen.display_info.height))
}

#[tauri::command]
pub async fn get_display_dimensions() -> Result<DisplayDimensions, String> {
    let (width, height) = get_primary_display_dimensions().await?;
    Ok(DisplayDimensions { width, height })
}

#[tauri::command]
pub async fn capture_display() -> Result<String, String> {
    info!("Capturing primary display...");
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    let screen = screens.first().ok_or("No screens found".to_string())?;

    let image = screen.capture().map_err(|e| format!("Failed to capture screen: {}", e))?;

    let temp_dir = PathBuf::from("D:\\screenshots\\nova-agent");
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp screenshot dir: {}", e))?;

    let temp_file = temp_dir.join("temp_capture.png");
    image.save(&temp_file).map_err(|e| format!("Failed to save temp screenshot: {}", e))?;

    let png_bytes = fs::read(&temp_file).map_err(|e| format!("Failed to read temp screenshot: {}", e))?;

    // Clean up temp file
    let _ = fs::remove_file(&temp_file);

    let mut b64 = String::new();
    {
        let mut encoder = base64_encode_writer(&mut b64);
        encoder.write_all(&png_bytes).map_err(|e| format!("Base64 encode failed: {}", e))?;
    }

    Ok(b64)
}

struct Base64Writer<'a> {
    buf: &'a mut String,
}

fn base64_encode_writer(buf: &mut String) -> Base64Writer<'_> {
    Base64Writer { buf }
}

impl std::io::Write for Base64Writer<'_> {
    fn write(&mut self, data: &[u8]) -> std::io::Result<usize> {
        const TABLE: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        let chunks = data.chunks(3);
        for chunk in chunks {
            match chunk.len() {
                3 => {
                    let n = (chunk[0] as u32) << 16 | (chunk[1] as u32) << 8 | chunk[2] as u32;
                    self.buf.push(TABLE[(n >> 18 & 0x3F) as usize] as char);
                    self.buf.push(TABLE[(n >> 12 & 0x3F) as usize] as char);
                    self.buf.push(TABLE[(n >> 6 & 0x3F) as usize] as char);
                    self.buf.push(TABLE[(n & 0x3F) as usize] as char);
                }
                2 => {
                    let n = (chunk[0] as u32) << 16 | (chunk[1] as u32) << 8;
                    self.buf.push(TABLE[(n >> 18 & 0x3F) as usize] as char);
                    self.buf.push(TABLE[(n >> 12 & 0x3F) as usize] as char);
                    self.buf.push(TABLE[(n >> 6 & 0x3F) as usize] as char);
                    self.buf.push('=');
                }
                1 => {
                    let n = (chunk[0] as u32) << 16;
                    self.buf.push(TABLE[(n >> 18 & 0x3F) as usize] as char);
                    self.buf.push(TABLE[(n >> 12 & 0x3F) as usize] as char);
                    self.buf.push('=');
                    self.buf.push('=');
                }
                _ => {}
            }
        }
        Ok(data.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
