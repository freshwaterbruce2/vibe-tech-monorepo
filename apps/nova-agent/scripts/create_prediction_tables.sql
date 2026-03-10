-- Proactive recommendations table
CREATE TABLE IF NOT EXISTS proactive_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_label TEXT NOT NULL,
    action_command TEXT NOT NULL,
    confidence REAL,
    estimated_impact TEXT,
    executed INTEGER DEFAULT 0,
    dismissed INTEGER DEFAULT 0,
    metadata TEXT
);

-- Prediction accuracy tracking
CREATE TABLE IF NOT EXISTS prediction_accuracy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER NOT NULL,
    predicted_value REAL NOT NULL,
    actual_value REAL NOT NULL,
    error_percentage REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (prediction_id) REFERENCES proactive_recommendations(id)
);