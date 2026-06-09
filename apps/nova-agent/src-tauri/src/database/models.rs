use crate::database::connection::DatabaseService;
use crate::database::types::DbModel;
use rusqlite::params;

impl DatabaseService {
    pub fn create_models_table(&self) -> rusqlite::Result<()> {
        self.models_db.execute(
            "CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                inputCost REAL NOT NULL,
                outputCost REAL NOT NULL,
                contextWindow TEXT NOT NULL,
                speed TEXT CHECK(speed IN ('fast', 'medium', 'slow')) NOT NULL,
                quality INTEGER CHECK(quality BETWEEN 1 AND 5) NOT NULL,
                bestFor TEXT NOT NULL,
                tier TEXT CHECK(tier IN ('free', 'low', 'medium', 'high')) NOT NULL,
                recommended INTEGER CHECK(recommended IN (0, 1)) DEFAULT 0
            )",
            [],
        )?;

        self.models_db.execute(
            "CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                modelId TEXT NOT NULL,
                inputCost REAL NOT NULL,
                outputCost REAL NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (modelId) REFERENCES models(id) ON DELETE CASCADE
            )",
            [],
        )?;
        Ok(())
    }

    pub fn seed_baseline_models(&self) -> rusqlite::Result<()> {
        let count: i64 = self.models_db.query_row(
            "SELECT COUNT(*) FROM models",
            [],
            |row| row.get(0),
        )?;

        if count > 0 {
            return Ok(());
        }

        let baseline_models = vec![
            DbModel {
                id: "google/gemini-3.5-flash".to_string(),
                name: "Gemini 3.5 Flash".to_string(),
                provider: "Google".to_string(),
                input_cost: 0.075,
                output_cost: 0.3,
                context_window: "1M".to_string(),
                speed: "fast".to_string(),
                quality: 4,
                best_for: "Latest Gemini 3.5 - High-tier agentic & coding speed".to_string(),
                tier: "low".to_string(),
                recommended: Some(true),
            },
            DbModel {
                id: "kimi/kimi-k2.6".to_string(),
                name: "Kimi K2.6".to_string(),
                provider: "Moonshot".to_string(),
                input_cost: 1.5,
                output_cost: 1.5,
                context_window: "128K".to_string(),
                speed: "medium".to_string(),
                quality: 5,
                best_for: "Advanced Kimi model with excellent Chinese reasoning".to_string(),
                tier: "medium".to_string(),
                recommended: Some(false),
            },
            DbModel {
                id: "anthropic/claude-sonnet-4.5".to_string(),
                name: "Claude Sonnet 4.5".to_string(),
                provider: "Anthropic".to_string(),
                input_cost: 3.0,
                output_cost: 15.0,
                context_window: "200K".to_string(),
                speed: "medium".to_string(),
                quality: 5,
                best_for: "Best for coding - Superior quality".to_string(),
                tier: "medium".to_string(),
                recommended: Some(false),
            },
            DbModel {
                id: "anthropic/claude-haiku-3.5".to_string(),
                name: "Claude Haiku 3.5".to_string(),
                provider: "Anthropic".to_string(),
                input_cost: 0.8,
                output_cost: 4.0,
                context_window: "200K".to_string(),
                speed: "fast".to_string(),
                quality: 4,
                best_for: "Fastest Claude - Low latency".to_string(),
                tier: "low".to_string(),
                recommended: Some(false),
            },
            DbModel {
                id: "anthropic/claude-opus-4.5".to_string(),
                name: "Claude Opus 4.5".to_string(),
                provider: "Anthropic".to_string(),
                input_cost: 15.0,
                output_cost: 75.0,
                context_window: "200K".to_string(),
                speed: "slow".to_string(),
                quality: 5,
                best_for: "Highest quality - Creative writing".to_string(),
                tier: "high".to_string(),
                recommended: Some(false),
            },
            DbModel {
                id: "openai/gpt-5".to_string(),
                name: "GPT-5".to_string(),
                provider: "OpenAI".to_string(),
                input_cost: 1.25,
                output_cost: 10.0,
                context_window: "272K".to_string(),
                speed: "medium".to_string(),
                quality: 5,
                best_for: "Latest GPT flagship - Excellent reasoning".to_string(),
                tier: "medium".to_string(),
                recommended: Some(true),
            },
            DbModel {
                id: "openai/gpt-5-mini".to_string(),
                name: "GPT-5 Mini".to_string(),
                provider: "OpenAI".to_string(),
                input_cost: 0.25,
                output_cost: 2.0,
                context_window: "272K".to_string(),
                speed: "fast".to_string(),
                quality: 4,
                best_for: "Fast & affordable GPT-5 variant".to_string(),
                tier: "low".to_string(),
                recommended: Some(false),
            },
            DbModel {
                id: "openai/gpt-5.2-pro".to_string(),
                name: "GPT-5.2 Pro".to_string(),
                provider: "OpenAI".to_string(),
                input_cost: 10.0,
                output_cost: 30.0,
                context_window: "272K".to_string(),
                speed: "slow".to_string(),
                quality: 5,
                best_for: "Maximum intelligence - Complex reasoning".to_string(),
                tier: "high".to_string(),
                recommended: Some(true),
            },
            DbModel {
                id: "deepseek/deepseek-v3.2".to_string(),
                name: "DeepSeek V3.2".to_string(),
                provider: "DeepSeek".to_string(),
                input_cost: 0.27,
                output_cost: 1.1,
                context_window: "128K".to_string(),
                speed: "fast".to_string(),
                quality: 5,
                best_for: "Best for coding - 95% cheaper than GPT-4 (Jan 2026)".to_string(),
                tier: "low".to_string(),
                recommended: Some(true),
            },
            DbModel {
                id: "deepseek/deepseek-chat".to_string(),
                name: "DeepSeek V3".to_string(),
                provider: "DeepSeek".to_string(),
                input_cost: 0.27,
                output_cost: 1.1,
                context_window: "128K".to_string(),
                speed: "fast".to_string(),
                quality: 5,
                best_for: "Legacy - Use V3.2 instead".to_string(),
                tier: "low".to_string(),
                recommended: Some(false),
            },
        ];

        for m in baseline_models {
            self.models_db.execute(
                "INSERT OR IGNORE INTO models (id, name, provider, inputCost, outputCost, contextWindow, speed, quality, bestFor, tier, recommended)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    m.id,
                    m.name,
                    m.provider,
                    m.input_cost,
                    m.output_cost,
                    m.context_window,
                    m.speed,
                    m.quality,
                    m.best_for,
                    m.tier,
                    if m.recommended.unwrap_or(false) { 1 } else { 0 }
                ],
            )?;
        }

        Ok(())
    }

    pub fn get_models(&self) -> rusqlite::Result<Vec<DbModel>> {
        let mut stmt = self.models_db.prepare(
            "SELECT id, name, provider, inputCost, outputCost, contextWindow, speed, quality, bestFor, tier, recommended FROM models"
        )?;

        let model_iter = stmt.query_map([], |row| {
            let recommended_int: Option<i32> = row.get(10)?;
            let recommended = recommended_int.map(|val| val == 1);
            Ok(DbModel {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                input_cost: row.get(3)?,
                output_cost: row.get(4)?,
                context_window: row.get(5)?,
                speed: row.get(6)?,
                quality: row.get(7)?,
                best_for: row.get(8)?,
                tier: row.get(9)?,
                recommended,
            })
        })?;

        let mut models = Vec::new();
        for model in model_iter {
            models.push(model?);
        }
        Ok(models)
    }
}
