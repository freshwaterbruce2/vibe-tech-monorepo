"""Idempotent migration: add tokens_used + selected_model to agent_executions.

SQLite has no ADD COLUMN IF NOT EXISTS, so guard via PRAGMA table_info and
swallow the duplicate-column OperationalError as a belt-and-suspenders.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(r"D:\databases\agent_learning.db")
WANT = {"tokens_used": "INTEGER", "selected_model": "TEXT"}

conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=30000")
try:
    existing = {row[1] for row in conn.execute("PRAGMA table_info(agent_executions)")}
    for col, coltype in WANT.items():
        if col in existing:
            print(f"skip  {col} (already present)")
            continue
        try:
            conn.execute(f"ALTER TABLE agent_executions ADD COLUMN {col} {coltype}")
            print(f"added {col} {coltype}")
        except sqlite3.OperationalError as exc:
            if "duplicate column name" in str(exc).lower():
                print(f"skip  {col} (duplicate-column race)")
            else:
                raise
    conn.commit()
    cols = [row[1] for row in conn.execute("PRAGMA table_info(agent_executions)")]
    print("VERIFY tokens_used:", "tokens_used" in cols)
    print("VERIFY selected_model:", "selected_model" in cols)
    print("COLUMN COUNT:", len(cols))
finally:
    conn.close()
