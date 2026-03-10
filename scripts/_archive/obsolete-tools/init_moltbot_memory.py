
import sqlite3
import os
from datetime import datetime

DB_PATH = r"D:\databases\moltbot_memory.sqlite"

def init_db():
    if os.path.exists(DB_PATH):
        print(f"Database already exists at {DB_PATH}")
        return

    print(f"Creating database at {DB_PATH}...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create Facts Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        confidence REAL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    ''')

    # Create Interactions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_input TEXT,
        bot_response TEXT,
        context_summary TEXT,
        timestamp TEXT NOT NULL
    )
    ''')

    # Create Metadata Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')

    # Insert Initial Metadata
    now = datetime.now().isoformat()
    cursor.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)", ("schema_version", "1.0.0"))
    cursor.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)", ("created_at", now))

    conn.commit()
    conn.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
