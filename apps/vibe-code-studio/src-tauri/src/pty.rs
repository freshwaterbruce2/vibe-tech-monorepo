use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

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

    state.sessions.lock().unwrap().insert(id.clone(), PtyCommandSession {
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
        state_clone.lock().unwrap().remove(&id_exit);
    });

    Ok(id)
}

#[tauri::command]
pub fn pty_write(
    state: State<'_, PtyState>,
    id: String,
    data: String,
) -> Result<(), String> {
    if let Some(session) = state.sessions.lock().unwrap().get_mut(&id) {
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
    if let Some(session) = state.sessions.lock().unwrap().get_mut(&id) {
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
    state.sessions.lock().unwrap().remove(&id);
    Ok(())
}
