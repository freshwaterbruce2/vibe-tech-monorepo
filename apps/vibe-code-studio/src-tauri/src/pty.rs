use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;
use tauri::{AppHandle, Emitter, State};

/// Shell binaries allowed to be spawned by the renderer via `pty_spawn`.
/// Comparison is case-insensitive on the file-name component only;
/// absolute paths to one of these binaries are acceptable.
const ALLOWED_SHELLS: &[&str] = &[
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "bash.exe",
    "git-bash.exe",
    "wsl.exe",
    "bash",
    "sh",
    "zsh",
];

/// Validate that `shell` resolves to an allow-listed shell binary.
fn validate_shell(shell: &str) -> Result<(), String> {
    if shell.is_empty() {
        return Err("shell argument is empty".into());
    }
    let name = Path::new(shell)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| format!("invalid shell path: {shell}"))?;
    if ALLOWED_SHELLS
        .iter()
        .any(|a| a.eq_ignore_ascii_case(name))
    {
        Ok(())
    } else {
        Err(format!(
            "shell not in allowlist: {name} (allowed: {})",
            ALLOWED_SHELLS.join(", ")
        ))
    }
}

/// Validate that `cwd` is an absolute, existing directory and not a UNC
/// or Windows device path.
fn validate_cwd(cwd: &str) -> Result<(), String> {
    if cwd.is_empty() {
        return Err("cwd cannot be empty".into());
    }
    if cwd.starts_with("\\\\") {
        return Err("UNC and device paths are not allowed for cwd".into());
    }
    let path = Path::new(cwd);
    if !path.is_absolute() {
        return Err(format!("cwd must be an absolute path: {cwd}"));
    }
    let meta = std::fs::metadata(path)
        .map_err(|e| format!("cwd is not accessible: {e}"))?;
    if !meta.is_dir() {
        return Err(format!("cwd is not a directory: {cwd}"));
    }
    Ok(())
}

/// Acquire a mutex guard, recovering from poisoning silently.
///
/// The PTY session map is robust to partial writes (HashMap inserts and
/// removes are atomic from our perspective), so on poison we recover the
/// inner state rather than propagating a panic to the caller.
fn lock_recover<T>(m: &Arc<Mutex<T>>) -> MutexGuard<'_, T> {
    match m.lock() {
        Ok(g) => g,
        Err(poisoned) => poisoned.into_inner(),
    }
}

pub struct PtyCommandSession {
    pub master: Box<dyn portable_pty::MasterPty + Send>,
    pub writer: Box<dyn std::io::Write + Send>,
}

pub struct PtyState {
    pub sessions: Arc<Mutex<HashMap<String, PtyCommandSession>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[derive(Clone, serde::Serialize)]
struct PtyDataPayload {
    id: String,
    data: String,
}

#[derive(Clone, serde::Serialize)]
struct PtyExitPayload {
    id: String,
    exit_code: Option<u32>,
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyState>,
    id: String,
    shell: String,
    args: Vec<String>,
    cols: u16,
    rows: u16,
    cwd: String,
    env: HashMap<String, String>,
) -> Result<String, String> {
    validate_shell(&shell)?;
    validate_cwd(&cwd)?;

    let pty_system = native_pty_system();

    let pair = pty_system.openpty(PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&shell);
    cmd.args(&args);
    cmd.cwd(&cwd);

    for (k, v) in env {
        cmd.env(k, v);
    }

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    // Store master
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    lock_recover(&state.sessions).insert(id.clone(), PtyCommandSession {
        master: pair.master,
        writer,
    });

    // Read thread
    let id_clone = id.clone();
    let app_clone = app.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 1024];
        loop {
            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_clone.emit("terminal:data", PtyDataPayload {
                        id: id_clone.clone(),
                        data,
                    });
                }
                _ => break,
            }
        }
    });

    // Wait thread
    let id_exit = id.clone();
    let app_exit = app.clone();
    let state_clone = state.inner().sessions.clone();
    thread::spawn(move || {
        let exit_status = child.wait().ok();
        let _ = app_exit.emit("terminal:exit", PtyExitPayload {
            id: id_exit.clone(),
            exit_code: exit_status.map(|s| s.exit_code()),
        });
        lock_recover(&state_clone).remove(&id_exit);
    });

    Ok(id)
}

#[tauri::command]
pub fn pty_write(
    state: State<'_, PtyState>,
    id: String,
    data: String,
) -> Result<(), String> {
    if let Some(session) = lock_recover(&state.sessions).get_mut(&id) {
        let _ = session.writer.write_all(data.as_bytes());
    }
    Ok(())
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    if let Some(session) = lock_recover(&state.sessions).get_mut(&id) {
        let _ = session.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
    }
    Ok(())
}

#[tauri::command]
pub fn pty_dispose(
    state: State<'_, PtyState>,
    id: String,
) -> Result<(), String> {
    lock_recover(&state.sessions).remove(&id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_allowlist_accepts_known_binaries() {
        assert!(validate_shell("powershell.exe").is_ok());
        assert!(validate_shell("cmd.exe").is_ok());
        assert!(validate_shell("pwsh.exe").is_ok());
        assert!(validate_shell("bash").is_ok());
        assert!(validate_shell("/bin/bash").is_ok());
        assert!(validate_shell(r"C:\Windows\System32\cmd.exe").is_ok());
    }

    #[test]
    fn shell_allowlist_is_case_insensitive() {
        assert!(validate_shell("POWERSHELL.EXE").is_ok());
        assert!(validate_shell("Cmd.Exe").is_ok());
    }

    #[test]
    fn shell_allowlist_rejects_unknown_binaries() {
        assert!(validate_shell("notepad.exe").is_err());
        assert!(validate_shell("rm").is_err());
        assert!(validate_shell("/bin/rm").is_err());
        assert!(validate_shell(r"C:\Windows\System32\calc.exe").is_err());
        assert!(validate_shell("").is_err());
    }

    #[test]
    fn cwd_rejects_empty_and_relative() {
        assert!(validate_cwd("").is_err());
        assert!(validate_cwd("relative/path").is_err());
        assert!(validate_cwd(".").is_err());
    }

    #[test]
    fn cwd_rejects_unc_and_device_paths() {
        assert!(validate_cwd(r"\\server\share").is_err());
        assert!(validate_cwd(r"\\?\C:\Windows").is_err());
        assert!(validate_cwd(r"\\.\pipe\foo").is_err());
    }

    #[test]
    fn cwd_accepts_existing_absolute_directory() {
        let tmp = std::env::temp_dir();
        let tmp_str = tmp.to_str().expect("temp_dir is UTF-8");
        assert!(validate_cwd(tmp_str).is_ok());
    }

    #[test]
    fn cwd_rejects_nonexistent_path() {
        assert!(validate_cwd(r"C:\definitely\not\a\real\path\vibe-test-xyz-99999").is_err());
    }
}
