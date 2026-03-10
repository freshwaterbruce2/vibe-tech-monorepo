import os
import sqlite3
import sys

DB_PATH = "D:\\databases\\nova_shared.db"


def verify():
    print(f"Checking database at {DB_PATH}...")
    if not os.path.exists(DB_PATH):
        print("FAIL: Database file not found!")
        sys.exit(1)

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check for agent_executions table
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_executions'"
        )
        if not cursor.fetchone():
            print("FAIL: agent_executions table not found!")
            sys.exit(1)

        print("SUCCESS: agent_executions table found.")

        # Check schema
        cursor.execute("PRAGMA table_info(agent_executions)")
        cols = {row[1] for row in cursor.fetchall()}
        required = {
            "agent_name",
            "task_type",
            "success",
            "execution_time",
            "error_details",
        }
        missing = required - cols
        if missing:
            print(f"FAIL: Missing columns: {missing}")
            sys.exit(1)

        print("SUCCESS: Schema verification passed.")

        conn.close()
        print("ALL CHECKS PASSED.")
    except Exception as e:
        print(f"FAIL: Exception occurred: {e}")
        sys.exit(1)


if __name__ == "__main__":
    verify()
