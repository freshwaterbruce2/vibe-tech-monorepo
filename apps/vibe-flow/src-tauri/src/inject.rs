//! Text injection into the focused window.
//!
//! Primary path: synthetic keystrokes via enigo (Win32 `SendInput`).
//! Fallback path: clipboard + Ctrl+V for apps that drop rapid synthetic
//! keystrokes. Phase 0 exposes both so per-app reliability can be tested.

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

/// Delay before typing so physically-held hotkey modifiers (Ctrl/Shift) are
/// released by the user — otherwise the injected characters combine with the
/// held modifiers and garble (e.g. Ctrl+H).
const MODIFIER_RELEASE_DELAY: Duration = Duration::from_millis(250);

/// How text is delivered to the focused window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InjectMethod {
    Type,
    Paste,
}

impl InjectMethod {
    pub fn from_str(value: Option<&str>) -> Self {
        match value {
            Some("paste") => InjectMethod::Paste,
            _ => InjectMethod::Type,
        }
    }
}

/// Inject `text` into the currently focused window.
pub fn inject(text: &str, method: InjectMethod) -> Result<(), String> {
    thread::sleep(MODIFIER_RELEASE_DELAY);
    match method {
        InjectMethod::Type => type_text(text),
        InjectMethod::Paste => paste_text(text),
    }
}

fn new_enigo() -> Result<Enigo, String> {
    Enigo::new(&Settings::default()).map_err(|e| format!("enigo init failed: {e}"))
}

/// Type text character-by-character via SendInput (Unicode-safe).
fn type_text(text: &str) -> Result<(), String> {
    let mut enigo = new_enigo()?;
    enigo
        .text(text)
        .map_err(|e| format!("keystroke injection failed: {e}"))
}

/// Set the clipboard and synthesize Ctrl+V.
fn paste_text(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|e| format!("clipboard open failed: {e}"))?;
    clipboard
        .set_text(text.to_owned())
        .map_err(|e| format!("clipboard set failed: {e}"))?;

    let mut enigo = new_enigo()?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| format!("ctrl press failed: {e}"))?;
    let result = enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| format!("v click failed: {e}"));
    // Always release Ctrl, even if the click failed, or the user's keyboard
    // is left in a stuck-modifier state.
    let release = enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| format!("ctrl release failed: {e}"));
    result.and(release)
}

#[cfg(test)]
mod tests {
    use super::InjectMethod;

    #[test]
    fn method_parses_paste() {
        assert_eq!(InjectMethod::from_str(Some("paste")), InjectMethod::Paste);
    }

    #[test]
    fn method_defaults_to_type() {
        assert_eq!(InjectMethod::from_str(None), InjectMethod::Type);
        assert_eq!(InjectMethod::from_str(Some("type")), InjectMethod::Type);
        assert_eq!(InjectMethod::from_str(Some("bogus")), InjectMethod::Type);
    }
}
