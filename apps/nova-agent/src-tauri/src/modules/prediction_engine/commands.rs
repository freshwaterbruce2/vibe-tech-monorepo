use super::{
    PredictionAccuracyMetrics, PredictionEngine, PredictionResult, ProductivityInsights,
    Recommendation, RiskLevel, TimeWindow,
};
use std::sync::{Arc, Mutex};
use tracing::debug;

#[tauri::command]
pub async fn get_task_prediction(
    task_id: String,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<PredictionResult, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.predict_task_duration(&task_id)
}

#[tauri::command]
pub async fn get_productivity_insights(
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<ProductivityInsights, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.get_productivity_insights()
}

#[tauri::command]
pub async fn get_proactive_recommendations(
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<Vec<Recommendation>, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.get_proactive_recommendations()
}

#[tauri::command]
pub async fn assess_commit_risk_command(
    files: Vec<String>,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<RiskLevel, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.assess_commit_risk(&files)
}

#[tauri::command]
pub async fn recommend_task_timing_command(
    task_type: String,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<TimeWindow, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.recommend_task_timing(&task_type)
}

#[tauri::command]
pub async fn execute_recommendation(
    recommendation_id: i64,
    command: String,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<(), String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    debug!(
        "Recording recommendation #{} as executed for action '{}'",
        recommendation_id, command
    );
    engine.mark_recommendation_executed(recommendation_id)
}

#[tauri::command]
pub async fn dismiss_recommendation(
    recommendation_id: i64,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<(), String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.dismiss_recommendation(recommendation_id)
}

#[tauri::command]
pub async fn get_prediction_accuracy(
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<PredictionAccuracyMetrics, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.get_prediction_accuracy_metrics()
}
