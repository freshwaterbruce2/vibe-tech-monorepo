//! HTML-to-screenshot via headless Chromium (Edge on Windows 11).
//!
//! Called from the renderer process via `invoke('render_html_screenshot', { html, width, height })`.
//! Returns the screenshot as a base64-encoded PNG string.

use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Find a Chromium-based browser on the system.
/// Priority: Chrome → Edge (guaranteed on Windows 11) → Brave.
fn find_browser() -> Option<PathBuf> {
    let candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
    ];

    candidates
        .iter()
        .map(PathBuf::from)
        .find(|p| p.exists())
}

/// Render an HTML string to a PNG screenshot and return it as base64.
///
/// Workflow:
/// 1. Write HTML to a temp file.
/// 2. Launch headless Chromium with `--screenshot`.
/// 3. Read the output PNG and base64-encode it.
/// 4. Clean up temp files.
#[tauri::command]
pub async fn render_html_screenshot(
    html: String,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<String, String> {
    let browser = find_browser().ok_or_else(|| {
        "No Chromium-based browser found. Install Chrome or Edge.".to_string()
    })?;

    let w = width.unwrap_or(1280);
    let h = height.unwrap_or(720);

    // Write HTML to a temp file
    let temp_dir = std::env::temp_dir().join("vibe-code-studio");
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {e}"))?;

    let html_path = temp_dir.join("render_input.html");
    let screenshot_path = temp_dir.join("render_output.png");

    // Clean up any previous screenshot
    let _ = fs::remove_file(&screenshot_path);

    fs::write(&html_path, &html).map_err(|e| format!("Failed to write HTML: {e}"))?;

    let html_url = format!("file:///{}", html_path.display().to_string().replace('\\', "/"));

    // Spawn headless browser
    let output = Command::new(&browser)
        .args([
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-software-rasterizer",
            &format!("--window-size={w},{h}"),
            &format!("--screenshot={}", screenshot_path.display()),
            "--default-background-color=0",
            &html_url,
        ])
        .output()
        .map_err(|e| format!("Failed to launch browser: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Browser exited with {}: {}",
            output.status,
            stderr.chars().take(500).collect::<String>()
        ));
    }

    // Read screenshot and encode as base64
    let png_bytes = fs::read(&screenshot_path).map_err(|e| {
        format!("Screenshot not produced (browser: {}): {e}", browser.display())
    })?;

    // Cleanup
    let _ = fs::remove_file(&html_path);
    let _ = fs::remove_file(&screenshot_path);

    use std::io::Write;
    let mut b64 = String::new();
    {
        let mut encoder = base64_encode_writer(&mut b64);
        encoder
            .write_all(&png_bytes)
            .map_err(|e| format!("base64 encode failed: {e}"))?;
    }

    Ok(b64)
}

/// Minimal base64 encoder (avoids adding a crate dependency).
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
