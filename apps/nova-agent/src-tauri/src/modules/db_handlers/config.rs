use super::types::TradingConfig;
use crate::modules::state::Config;
use tauri::State;

#[tauri::command]
pub async fn get_trading_config(config: State<'_, Config>) -> Result<TradingConfig, String> {
    Ok(TradingConfig {
        data_dir: config.trading_data_dir.clone(),
        logs_dir: config.trading_logs_dir.clone(),
    })
}
