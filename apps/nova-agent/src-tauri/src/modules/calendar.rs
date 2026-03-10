use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::command;
use tracing::info;

// Defines the Event structure matching frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: String,
    pub date: String, // Store as ISO string
}

pub struct CalendarStore {
    events: Mutex<Vec<Event>>,
    file_path: PathBuf,
}

impl CalendarStore {
    pub fn new() -> Self {
        let file_path = PathBuf::from("D:\\databases\\nova_calendar.json");
        let events = if file_path.exists() {
             match fs::read_to_string(&file_path) {
                 Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| Vec::new()),
                 Err(_) => Vec::new(),
             }
        } else {
             Vec::new()
        };

        Self {
            events: Mutex::new(events),
            file_path,
        }
    }

    fn save(&self) -> Result<(), String> {
        let events = self.events.lock().map_err(|e| e.to_string())?;
        let content = serde_json::to_string_pretty(&*events).map_err(|e| e.to_string())?;
        fs::write(&self.file_path, content).map_err(|e| e.to_string())
    }
}

// Global state for calendar
pub static CALENDAR_STORE: std::sync::LazyLock<CalendarStore> = std::sync::LazyLock::new(CalendarStore::new);

#[command]
pub async fn get_calendar_events() -> Result<Vec<Event>, String> {
    let store = &CALENDAR_STORE;
    let events = store.events.lock().map_err(|e| e.to_string())?;
    Ok(events.clone())
}

#[command]
pub async fn add_calendar_event(event: Event) -> Result<(), String> {
    let store = &CALENDAR_STORE;
    {
        let mut events = store.events.lock().map_err(|e| e.to_string())?;
        // Upsert logic: if ID exists, replace; else, push.
        if let Some(pos) = events.iter().position(|e| e.id == event.id) {
            events[pos] = event;
            info!("Updated calendar event");
        } else {
            events.push(event);
            info!("Added calendar event");
        }
    }
    store.save()?;
    Ok(())
}

#[command]
pub async fn delete_calendar_event(id: String) -> Result<(), String> {
    let store = &CALENDAR_STORE;
    {
        let mut events = store.events.lock().map_err(|e| e.to_string())?;
        events.retain(|e| e.id != id);
    }
    store.save()?;
    info!("Deleted calendar event {}", id);
    Ok(())
}
