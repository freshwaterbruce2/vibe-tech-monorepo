use super::{
    PredictionEngine, PredictionResult, ProductivityInsights, Recommendation, RiskLevel, TimeWindow,
};
use std::sync::{Arc, Mutex};

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
