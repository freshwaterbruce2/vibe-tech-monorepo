-- ============================================
-- VIBEBLOX DATABASE SCHEMA
-- ============================================

-- Users table (parent + child accounts)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('child', 'parent')) NOT NULL,
    avatar_mood TEXT DEFAULT 'happy',
    current_coins INTEGER DEFAULT 0,
    lifetime_coins INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    sound_enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Streaks table (per-category streaks)
CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category)
);

-- Quest definitions
CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    icon TEXT NOT NULL,
    base_coins INTEGER NOT NULL,
    bonus_coins INTEGER NOT NULL,
    is_daily BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quest completions (transactions for earning)
CREATE TABLE IF NOT EXISTS quest_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    quest_id INTEGER NOT NULL REFERENCES quests(id),
    without_reminder BOOLEAN DEFAULT 0,
    base_coins INTEGER NOT NULL,
    multiplier REAL DEFAULT 1.0,
    final_coins INTEGER NOT NULL,
    notes TEXT,
    awarded_by INTEGER REFERENCES users(id),
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reward definitions (shop items)
CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    cost INTEGER NOT NULL,
    real_value TEXT,
    rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    is_limited BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchases (transactions for spending)
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reward_id INTEGER NOT NULL REFERENCES rewards(id),
    cost INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'fulfilled', 'denied')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    fulfilled_at DATETIME
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    requirement_category TEXT,
    bonus_coins INTEGER DEFAULT 0,
    rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (unlocked)
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Daily log (for tracking daily activity)
CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL,
    quests_completed INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    without_reminder_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date)
);

-- Activity feed / notifications
CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    coins_change INTEGER DEFAULT 0,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_completions_user ON quest_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_date ON quest_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
