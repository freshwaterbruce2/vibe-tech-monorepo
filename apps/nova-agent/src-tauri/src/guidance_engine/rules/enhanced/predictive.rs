use super::super::GuidanceRule;
use crate::guidance_engine::types::{
    GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
};
use crate::guidance_engine::utils::{parse_context_json, timestamp_now};
use chrono::Timelike;

/// Rule: Predictive intelligence - ML-driven task completion predictions
pub(crate) struct PredictiveRule;

impl GuidanceRule for PredictiveRule {
    fn name(&self) -> &str {
        "predictive"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        // Analyze task completion patterns from learning events
        let completed_tasks: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| e.event_type == "task_completed" && e.outcome.as_deref() == Some("success"))
            .collect();

        if completed_tasks.len() >= 5 {
            // Calculate average task duration from context metadata
            let durations: Vec<u64> = completed_tasks
                .iter()
                .filter_map(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| obj.get("duration_minutes").and_then(|d| d.as_u64()))
                })
                .collect();

            if !durations.is_empty() {
                let avg_duration = durations.iter().sum::<u64>() / durations.len() as u64;
                let std_dev = {
                    let variance = durations
                        .iter()
                        .map(|&d| {
                            let diff = d as i64 - avg_duration as i64;
                            (diff * diff) as u64
                        })
                        .sum::<u64>()
                        / durations.len() as u64;
                    (variance as f64).sqrt() as u64
                };

                let confidence = if durations.len() >= 10 {
                    "high"
                } else if durations.len() >= 5 {
                    "medium"
                } else {
                    "low"
                };

                items.push(GuidanceItem {
                    id: format!("predict-duration-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Task duration prediction".to_string(),
                    description: format!(
                        "Based on {} completed tasks, similar tasks typically take {}±{} minutes ({} confidence).",
                        durations.len(),
                        avg_duration,
                        std_dev,
                        confidence
                    ),
                    action: None,
                    created_at: now,
                });
            }
        }

        // Predict optimal task ordering based on success patterns
        let in_progress_tasks: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| t.status == "in_progress")
            .collect();

        let pending_tasks: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| t.status == "pending" || t.status == "not_started")
            .collect();

        if in_progress_tasks.is_empty() && pending_tasks.len() > 1 {
            // Analyze success rates by task complexity from learning events
            let high_complexity_success = completed_tasks
                .iter()
                .filter(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| {
                            obj.get("complexity")
                                .and_then(|c| c.as_str().map(|s| s.to_string()))
                        })
                        .map(|c| c == "high")
                        .unwrap_or(false)
                })
                .count();

            let low_complexity_success = completed_tasks
                .iter()
                .filter(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| {
                            obj.get("complexity")
                                .and_then(|c| c.as_str().map(|s| s.to_string()))
                        })
                        .map(|c| c == "low")
                        .unwrap_or(false)
                })
                .count();

            if high_complexity_success > low_complexity_success {
                items.push(GuidanceItem {
                    id: format!("predict-ordering-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Optimal task ordering suggestion".to_string(),
                    description: "Your success rate is higher with complex tasks first. Consider starting with high-priority, challenging work while energy is fresh.".to_string(),
                    action: None,
                    created_at: now,
                });
            } else if low_complexity_success > 0 {
                items.push(GuidanceItem {
                    id: format!("predict-warmup-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Low,
                    title: "Warm-up task recommended".to_string(),
                    description: "You tend to succeed with simpler tasks first. Consider starting with a quick win to build momentum.".to_string(),
                    action: None,
                    created_at: now,
                });
            }
        }

        // Analyze productivity patterns by time of day
        let time_based_success: std::collections::HashMap<u8, usize> = completed_tasks
            .iter()
            .filter_map(|e| {
                parse_context_json(&e.context)
                    .and_then(|c| c.as_object().map(|o| o.to_owned()))
                    .and_then(|obj| obj.get("hour_of_day").and_then(|h| h.as_u64()))
                    .map(|h| h as u8)
            })
            .fold(std::collections::HashMap::new(), |mut acc, hour| {
                *acc.entry(hour).or_insert(0) += 1;
                acc
            });

        if let Some((peak_hour, count)) = time_based_success.iter().max_by_key(|(_, &c)| c) {
            if *count >= 3 {
                let current_hour = chrono::Local::now().hour() as u8;
                if current_hour == *peak_hour {
                    items.push(GuidanceItem {
                        id: format!("predict-peak-time-{}", now),
                        category: GuidanceCategory::DoingRight,
                        priority: GuidancePriority::Medium,
                        title: "Peak productivity time".to_string(),
                        description: format!(
                            "You're in your peak productivity window ({}:00-{}:00 based on {} successful completions). Great time for important work!",
                            peak_hour, peak_hour + 1, count
                        ),
                        action: None,
                        created_at: now,
                    });
                }
            }
        }

        items
    }
}
