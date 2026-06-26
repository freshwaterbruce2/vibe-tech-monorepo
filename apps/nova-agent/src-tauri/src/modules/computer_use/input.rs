use tracing::info;

use super::display::get_primary_display_dimensions;
use super::types::{KeyboardAction, MouseAction};

#[cfg(windows)]
use windows::Win32::{
    UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN,
        MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE,
        MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEINPUT, MOUSE_EVENT_FLAGS, VIRTUAL_KEY,
    },
    UI::WindowsAndMessaging::SetCursorPos,
};

#[tauri::command]
pub async fn simulate_mouse_action(action: MouseAction) -> Result<(), String> {
    info!("Simulating mouse action: {:?}", action);

    let (width, height) = get_primary_display_dimensions().await?;

    let physical_x = ((action.x as f64 / 1000.0) * width as f64) as i32;
    let physical_y = ((action.y as f64 / 1000.0) * height as f64) as i32;

    #[cfg(windows)]
    unsafe {
        if SetCursorPos(physical_x, physical_y).is_err() {
            return Err("Failed to set cursor position".to_string());
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;

        match action.action.as_str() {
            "move" => {
                // Moved
            }
            "click" => {
                send_mouse_input_windows(MOUSEEVENTF_LEFTDOWN);
                tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
                send_mouse_input_windows(MOUSEEVENTF_LEFTUP);
            }
            "right_click" => {
                send_mouse_input_windows(MOUSEEVENTF_RIGHTDOWN);
                tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
                send_mouse_input_windows(MOUSEEVENTF_RIGHTUP);
            }
            "double_click" => {
                send_mouse_input_windows(MOUSEEVENTF_LEFTDOWN);
                tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
                send_mouse_input_windows(MOUSEEVENTF_LEFTUP);
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                send_mouse_input_windows(MOUSEEVENTF_LEFTDOWN);
                tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
                send_mouse_input_windows(MOUSEEVENTF_LEFTUP);
            }
            "drag_to" => {
                send_mouse_input_windows(MOUSEEVENTF_LEFTDOWN);
                tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;

                let _ = SetCursorPos(physical_x, physical_y);
                tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;

                send_mouse_input_windows(MOUSEEVENTF_LEFTUP);
            }
            other => return Err(format!("Unsupported mouse action: {}", other)),
        }
    }

    #[cfg(not(windows))]
    return Err("Mouse simulation is only supported on Windows".to_string());

    Ok(())
}

#[tauri::command]
pub async fn simulate_keyboard_action(action: KeyboardAction) -> Result<(), String> {
    info!("Simulating keyboard action: {:?}", action);

    #[cfg(windows)]
    unsafe {
        match action.action.as_str() {
            "type" => {
                if let Some(text) = action.text {
                    for c in text.chars() {
                        type_character_windows(c);
                        tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
                    }
                }
            }
            "press_key" => {
                if let Some(key) = action.key {
                    if let Some(vk) = get_vk_from_name(&key) {
                        send_key_event_windows(vk, 0);
                        tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
                        send_key_event_windows(vk, KEYEVENTF_KEYUP.0);
                    } else {
                        return Err(format!("Unknown key name: {}", key));
                    }
                }
            }
            "hotkey" => {
                if let Some(key) = action.key {
                    if let Some(target_vk) = get_vk_from_name(&key) {
                        let mut modifier_vks = Vec::new();
                        if let Some(mods) = action.modifiers {
                            for m in mods {
                                if let Some(mod_vk) = get_vk_from_name(&m) {
                                    modifier_vks.push(mod_vk);
                                }
                            }
                        }

                        for &mod_vk in &modifier_vks {
                            send_key_event_windows(mod_vk, 0);
                        }

                        send_key_event_windows(target_vk, 0);
                        tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
                        send_key_event_windows(target_vk, KEYEVENTF_KEYUP.0);

                        for &mod_vk in modifier_vks.iter().rev() {
                            send_key_event_windows(mod_vk, KEYEVENTF_KEYUP.0);
                        }
                    } else {
                        return Err(format!("Unknown target key name: {}", key));
                    }
                }
            }
            other => return Err(format!("Unsupported keyboard action: {}", other)),
        }
    }

    #[cfg(not(windows))]
    return Err("Keyboard simulation is only supported on Windows".to_string());

    Ok(())
}

#[cfg(windows)]
fn get_vk_from_name(name: &str) -> Option<u16> {
    match name.to_lowercase().as_str() {
        "enter" => Some(0x0D),
        "backspace" | "back" => Some(0x08),
        "tab" => Some(0x09),
        "escape" | "esc" => Some(0x1B),
        "space" => Some(0x20),
        "up" => Some(0x26),
        "down" => Some(0x28),
        "left" => Some(0x25),
        "right" => Some(0x27),
        "pageup" | "pgup" => Some(0x21),
        "pagedown" | "pgdn" => Some(0x22),
        "end" => Some(0x23),
        "home" => Some(0x24),
        "delete" | "del" => Some(0x2E),
        "insert" | "ins" => Some(0x2D),
        "ctrl" | "control" => Some(0x11),
        "shift" => Some(0x10),
        "alt" => Some(0x12),
        "win" | "command" | "super" => Some(0x5B),
        s if s.len() == 1 => {
            let c = s.chars().next().unwrap().to_ascii_uppercase();
            if c.is_ascii_alphanumeric() {
                Some(c as u16)
            } else {
                None
            }
        }
        _ => None,
    }
}

#[cfg(windows)]
unsafe fn type_character_windows(c: char) {
    let mut utf16_buf = [0u16; 2];
    let utf16 = c.encode_utf16(&mut utf16_buf);
    for &code in utf16.iter() {
        let inputs = [
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(0),
                        wScan: code,
                        dwFlags: KEYEVENTF_UNICODE,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(0),
                        wScan: code,
                        dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];
        let _ = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
unsafe fn send_key_event_windows(vk: u16, flags: u32) {
    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                wScan: 0,
                dwFlags: KEYBD_EVENT_FLAGS(flags),
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let _ = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
}

#[cfg(windows)]
unsafe fn send_mouse_input_windows(flags: MOUSE_EVENT_FLAGS) {
    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let _ = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
}
