use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleBlock {
    pub id: String,
    pub title: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub activity_type: ActivityType,
    pub priority: u8,
    pub is_fixed: bool, // If true, AI cannot move this (e.g., school, bedtime)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ActivityType {
    Study,
    Break,
    Play,
    Meal,
    Sleep,
    School,
    Coding,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub wake_time: String, // "07:00"
    pub bed_time: String,  // "21:00"
    pub focus_duration_minutes: u32, // e.g., 25 for pomodoro
    pub break_duration_minutes: u32, // e.g., 5
    pub preferred_subjects: Vec<String>,
}

pub struct Scheduler {
    blocks: Vec<ScheduleBlock>,
    preferences: UserPreferences,
}

impl Scheduler {
    pub fn new(preferences: UserPreferences) -> Self {
        Self {
            blocks: Vec::new(),
            preferences,
        }
    }

    /// Generates a daily schedule based on fixed constraints and goals
    pub fn generate_daily_schedule(&mut self, date: DateTime<Utc>) -> Result<Vec<ScheduleBlock>, String> {
        let mut daily_blocks = Vec::new();

        // 1. Add Fixed Blocks (Sleep, Meals, School)
        daily_blocks.extend(self.generate_fixed_blocks(date));

        // 2. Fill gaps with dynamic activities
        // This is where the "AI" logic goes - balancing study vs play
        // For now, simple algorithm: alternate study/break until dinner

        // Sort fixed blocks by time
        daily_blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));

        let mut gaps = Vec::new();
        for i in 0..daily_blocks.len() - 1 {
            let current = &daily_blocks[i];
            let next = &daily_blocks[i + 1];
            
            if next.start_time > current.end_time {
                gaps.push((current.end_time, next.start_time));
            }
        }

        // Fill gaps
        for (start, end) in gaps {
            let duration = end.signed_duration_since(start).num_minutes();
            if duration >= self.preferences.focus_duration_minutes as i64 {
                // Insert a study block
                let study_end = start + chrono::Duration::minutes(self.preferences.focus_duration_minutes as i64);
                daily_blocks.push(ScheduleBlock {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: "Focus Time".to_string(),
                    start_time: start,
                    end_time: study_end,
                    activity_type: ActivityType::Study,
                    priority: 2,
                    is_fixed: false,
                });
                
                // If enough time, add a break
                if study_end < end {
                     daily_blocks.push(ScheduleBlock {
                        id: uuid::Uuid::new_v4().to_string(),
                        title: "Break".to_string(),
                        start_time: study_end,
                        end_time: std::cmp::min(study_end + chrono::Duration::minutes(self.preferences.break_duration_minutes as i64), end),
                        activity_type: ActivityType::Break,
                        priority: 1,
                        is_fixed: false,
                    });
                }
            }
        }

        daily_blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));
        self.blocks = daily_blocks.clone();
        Ok(daily_blocks)
    }

    fn generate_fixed_blocks(&self, _date: DateTime<Utc>) -> Vec<ScheduleBlock> {
        // Implementation would parse wake_time/bed_time strings and create blocks
        // Placeholder for now
        Vec::new()
    }
}

// Tauri Commands
#[tauri::command]
pub async fn generate_schedule(
    preferences: UserPreferences,
    date_iso: String
) -> Result<Vec<ScheduleBlock>, String> {
    let date = DateTime::parse_from_rfc3339(&date_iso)
        .map_err(|e| e.to_string())?
        .with_timezone(&Utc);

    let mut scheduler = Scheduler::new(preferences);
    scheduler.generate_daily_schedule(date)
}
