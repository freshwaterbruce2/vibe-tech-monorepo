use super::types::{ActiveWindowInfo, WindowRect};

#[cfg(windows)]
use windows::Win32::{
    Foundation::{CloseHandle, HWND, RECT},
    System::ProcessStatus::GetModuleBaseNameW,
    System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
    UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId,
    },
};

#[tauri::command]
pub async fn get_focused_window() -> Result<ActiveWindowInfo, String> {
    #[cfg(windows)]
    {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return Err("No active window found".to_string());
            }

            let mut title_buffer = [0u16; 512];
            let title_len = GetWindowTextW(hwnd, &mut title_buffer);
            let title = if title_len > 0 {
                String::from_utf16_lossy(&title_buffer[..title_len as usize])
            } else {
                String::new()
            };

            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));

            let process_name = get_process_name_internal(pid).unwrap_or_else(|| "unknown".to_string());

            let mut rect = RECT::default();
            let rect_opt = if GetWindowRect(hwnd, &mut rect).is_ok() {
                Some(WindowRect {
                    x: rect.left,
                    y: rect.top,
                    width: (rect.right - rect.left).max(0) as u32,
                    height: (rect.bottom - rect.top).max(0) as u32,
                })
            } else {
                None
            };

            Ok(ActiveWindowInfo {
                title,
                process_name,
                pid,
                rect: rect_opt,
            })
        }
    }

    #[cfg(not(windows))]
    Err("Not supported on this platform".to_string())
}

#[cfg(windows)]
fn get_process_name_internal(process_id: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            process_id,
        )
        .ok()?;

        let mut name_buffer = [0u16; 260];
        let len = GetModuleBaseNameW(handle, None, &mut name_buffer);
        let _ = CloseHandle(handle);

        if len > 0 {
            Some(String::from_utf16_lossy(&name_buffer[..len as usize]))
        } else {
            None
        }
    }
}
