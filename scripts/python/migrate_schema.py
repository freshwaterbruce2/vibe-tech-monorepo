import os
import sqlite3

DB_PATH = "D:\\databases\\nova_shared.db"


def migrate():
    print(f"Migrating database at {DB_PATH}...")
    if not os.path.exists(DB_PATH):
        print("FAIL: Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get current columns
    cursor.execute("PRAGMA table_info(agent_executions)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    columns_to_add = {
        "agent_name": 'TEXT NOT NULL DEFAULT "nova-agent-desktop"',
        "task_type": "TEXT",
        "success": "BOOLEAN",
        "execution_time": "REAL",
        "error_details": "TEXT",
    }

    for col, defn in columns_to_add.items():
        if col not in existing_cols:
            print(f"Adding column {col}...")
            try:
                cursor.execute(f"ALTER TABLE agent_executions ADD COLUMN {col} {defn}")
            except Exception as e:
                print(f"Error adding {col}: {e}")
        else:
            print(f"Column {col} already exists.")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
