//! Activity Monitor - Background service for tracking user activity
//! Monitors active windows, applications, and deep work sessions

use crate::database::DatabaseService;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, error, info, warn};

#[cfg(windows)]
use windows::Win32::{
    Foundation::{CloseHandle, HWND},
    System::ProcessStatus::GetModuleBaseNameW,
    System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
    UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId},
};

/// Information about the currently active window
#[derive(Debug, Clone)]
pub struct ActiveWindowInfo {
    pub window_title: String,
    pub process_name: String,
    pub process_id: u32,
    pub timestamp: u64,
}

/// Get the currently active window information using Windows API
#[cfg(windows)]
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() {
            return None;
        }

        // Get window title
        let mut title_buffer = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buffer);
        let window_title = if title_len > 0 {
            String::from_utf16_lossy(&title_buffer[..title_len as usize])
        } else {
            String::new()
        };

        // Get process ID
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        // Get process name
        let process_name = get_process_name(process_id).unwrap_or_else(|| "unknown".to_string());

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Some(ActiveWindowInfo {
            window_title,
            process_name,
            process_id,
            timestamp,
        })
    }
}

#[cfg(windows)]
fn get_process_name(process_id: u32) -> Option<String> {
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

#[cfg(not(windows))]
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    None
}

/// Activity Monitor that runs in the background
pub struct ActivityMonitor {
    db: Arc<AsyncMutex<Option<DatabaseService>>>,
    workspace_root: String,
    last_window: Option<ActiveWindowInfo>,
    focus_start: Option<u64>,
    current_app: Option<String>,
    active_deep_work_session_id: Option<i64>,
}

impl ActivityMonitor {
    pub fn new(db: Arc<AsyncMutex<Option<DatabaseService>>>, workspace_root: String) -> Self {
        Self {
            db,
            workspace_root,
            last_window: None,
            focus_start: None,
            current_app: None,
            active_deep_work_session_id: None,
        }
    }

    /// Start the background monitoring loop
    pub async fn run(&mut self) {
        info!("ActivityMonitor started - polling every 1s, snapshots every 10min");

        let mut interval = tokio::time::interval(Duration::from_secs(1));
        let mut log_counter = 0u32;
        let mut snapshot_counter = 0u32;
        let mut last_tick = Instant::now();

        loop {
            interval.tick().await;
            let now = Instant::now();
            let gap = now.duration_since(last_tick);
            last_tick = now;

            if gap > Duration::from_secs(120) {
                warn!("Detected sleep/resume gap: {} seconds", gap.as_secs());
                if let Some(id) = self.active_deep_work_session_id.take() {
                    let end_ts = self
                        .last_window
                        .as_ref()
                        .map(|w| w.timestamp as i64)
                        .unwrap_or_else(|| {
                            std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs() as i64
                        });
                    self.end_deep_work_session(id, end_ts).await;
                }
                self.last_window = None;
                self.focus_start = None;
                self.current_app = None;
                log_counter = 0;
                snapshot_counter = 0;
                self.log_to_db("sleep_resume", &format!("gap_secs={}", gap.as_secs()))
                    .await;
            }

            if let Some(window_info) = get_active_window() {
                // Check if window changed
                let window_changed = self
                    .last_window
                    .as_ref()
                    .map(|last| {
                        last.process_name != window_info.process_name
                            || last.window_title != window_info.window_title
                    })
                    .unwrap_or(true);

                if window_changed {
                    // Log the window switch
                    self.handle_window_change(&window_info).await;
                    self.last_window = Some(window_info.clone());
                }

                // 1-second liveness heartbeat (UPDATE single-row state, not event spam)
                self.upsert_focus_state(&window_info).await;

                // Start deep work session once focus crosses 15 minutes (even without window changes)
                self.maybe_start_deep_work_session(&window_info).await;

                // Log activity every 60 seconds regardless
                log_counter += 1;
                snapshot_counter += 1;
                if log_counter >= 60 {
                    self.log_periodic_activity(&window_info).await;
                    log_counter = 0;
                }

                // Capture context snapshot every 10 minutes (600s)
                if snapshot_counter >= 600 {
                    let engine =
                        crate::context_engine::ContextEngine::new(self.workspace_root.clone());
                    let snapshot = engine.get_snapshot();
                    if let Ok(json) = serde_json::to_string(&snapshot) {
                        self.log_to_db("context_snapshot", &json).await;
                    }
                    snapshot_counter = 0;
                }
            }
        }
    }

    async fn handle_window_change(&mut self, new_window: &ActiveWindowInfo) {
        // Close any active deep work session for the previous focus
        let had_active_session = self.active_deep_work_session_id.is_some();
        if let Some(id) = self.active_deep_work_session_id.take() {
            self.end_deep_work_session(id, new_window.timestamp as i64)
                .await;
        }

        // Calculate focus duration for previous window
        if let (Some(start), Some(app)) = (self.focus_start, &self.current_app) {
            let duration_secs = new_window.timestamp.saturating_sub(start);

            // Only log if focused for more than 5 seconds
            if duration_secs >= 5 {
                debug!("Focus ended: {} after {} seconds", app, duration_secs);

                // Check for deep work (15+ minutes on same app)
                if duration_secs >= 900 {
                    // Best-effort: if we never started a session while focused (e.g., DB busy),
                    // persist a completed session now.
                    if !had_active_session {
                        if let Some(prev) = self.last_window.as_ref() {
                            self.persist_completed_deep_work_session(
                                &prev.process_name,
                                &prev.window_title,
                                prev.process_id as i64,
                                start as i64,
                                new_window.timestamp as i64,
                            )
                            .await;
                        }
                    }
                    self.log_deep_work_session(app, duration_secs).await;
                }
            }
        }

        // Update current focus
        self.focus_start = Some(new_window.timestamp);
        self.current_app = Some(new_window.process_name.clone());

        // Log the window change to database
        debug!(
            "Window focus: {} ({}) pid={}",
            new_window.process_name, new_window.window_title, new_window.process_id
        );
        let details = format!("{}|{}", new_window.process_name, new_window.window_title);

        self.log_to_db("window_focus", &details).await;
    }

    async fn log_periodic_activity(&self, window_info: &ActiveWindowInfo) {
        let details = format!(
            "periodic|{}|{}",
            window_info.process_name, window_info.window_title
        );
        self.log_to_db("activity_check", &details).await;
    }

    async fn log_deep_work_session(&self, app: &str, duration_secs: u64) {
        let minutes = duration_secs / 60;
        info!(
            "Deep work session detected: {} for {} minutes",
            app, minutes
        );

        let details = format!("deep_work|{}|{}", app, minutes);
        self.log_to_db("deep_work", &details).await;
    }

    async fn upsert_focus_state(&self, window_info: &ActiveWindowInfo) {
        let focus_started_at = self
            .focus_start
            .unwrap_or(window_info.timestamp)
            .min(window_info.timestamp) as i64;

        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            if let Err(e) = service.upsert_focus_state(
                window_info.timestamp as i64,
                focus_started_at,
                &window_info.process_name,
                &window_info.window_title,
                window_info.process_id as i64,
            ) {
                warn!("Failed to upsert focus state: {}", e);
            }
        }
    }

    async fn maybe_start_deep_work_session(&mut self, window_info: &ActiveWindowInfo) {
        if self.active_deep_work_session_id.is_some() {
            return;
        }

        let Some(start) = self.focus_start else {
            return;
        };

        let duration_secs = window_info.timestamp.saturating_sub(start);
        if duration_secs < 900 {
            return;
        }

        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            match service.start_deep_work_session(
                &window_info.process_name,
                &window_info.window_title,
                window_info.process_id as i64,
                start as i64,
            ) {
                Ok(id) => {
                    self.active_deep_work_session_id = Some(id);
                    let _ = service.log_activity(
                        "deep_work_session_start",
                        &format!(
                            "id={}|app={}|pid={}|start_ts={}",
                            id, window_info.process_name, window_info.process_id, start
                        ),
                    );
                }
                Err(e) => warn!("Failed to start deep work session: {}", e),
            }
        }
    }

    async fn end_deep_work_session(&self, session_id: i64, end_ts: i64) {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            if let Err(e) = service.end_deep_work_session(session_id, end_ts) {
                warn!("Failed to end deep work session {}: {}", session_id, e);
            } else {
                let _ = service.log_activity(
                    "deep_work_session_end",
                    &format!("id={}|end_ts={}", session_id, end_ts),
                );
            }
        }
    }

    async fn persist_completed_deep_work_session(
        &self,
        app_name: &str,
        window_title: &str,
        process_id: i64,
        start_ts: i64,
        end_ts: i64,
    ) {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            match service.start_deep_work_session(app_name, window_title, process_id, start_ts) {
                Ok(id) => {
                    let _ = service.log_activity(
                        "deep_work_session_start",
                        &format!(
                            "id={}|app={}|pid={}|start_ts={}",
                            id, app_name, process_id, start_ts
                        ),
                    );
                    let _ = service.end_deep_work_session(id, end_ts);
                    let _ = service.log_activity(
                        "deep_work_session_end",
                        &format!("id={}|end_ts={}", id, end_ts),
                    );
                }
                Err(e) => warn!("Failed to persist completed deep work session: {}", e),
            }
        }
    }

    async fn log_to_db(&self, activity_type: &str, details: &str) {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            if let Err(e) = service.log_activity(activity_type, details) {
                warn!("Failed to log activity: {}", e);
            }
        }
    }
}

/// Spawn the activity monitor as a background task
pub fn spawn_activity_monitor(
    db: Arc<AsyncMutex<Option<DatabaseService>>>,
    workspace_root: String,
) {
    tokio::spawn(async move {
        if db.lock().await.is_none() {
            error!("Activity monitor not started: database service unavailable");
            return;
        }
        let mut monitor = ActivityMonitor::new(db, workspace_root);
        monitor.run().await;
    });
    info!("Activity monitor background task spawned");
}
