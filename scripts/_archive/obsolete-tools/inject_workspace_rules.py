
import sqlite3
import os
from datetime import datetime

DB_PATH = r"D:\databases\moltbot_memory.sqlite"
Workspace_Rules_Path = r"C:\dev\docs\ai\WORKSPACE.md"
Agents_Rules_Path = r"C:\dev\AGENTS.md"

def inject_rules():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    timestamp = datetime.now().isoformat()

    # 1. Inject Workspace Rules
    if os.path.exists(Workspace_Rules_Path):
        print(f"Reading {Workspace_Rules_Path}...")
        with open(Workspace_Rules_Path, 'r', encoding='utf-8') as f:
            content = f.read()

        cursor.execute("""
            INSERT OR REPLACE INTO facts (key, value, category, confidence, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('workspace_rules', content, 'core_directive', 1.0, timestamp, timestamp))
        print("Injected workspace_rules.")
    else:
        print(f"Warning: {Workspace_Rules_Path} not found.")

    # 2. Inject Agent Rules
    if os.path.exists(Agents_Rules_Path):
        print(f"Reading {Agents_Rules_Path}...")
        with open(Agents_Rules_Path, 'r', encoding='utf-8') as f:
            content = f.read()

        cursor.execute("""
            INSERT OR REPLACE INTO facts (key, value, category, confidence, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('agent_directives', content, 'core_directive', 1.0, timestamp, timestamp))
        print("Injected agent_directives.")
    else:
         print(f"Warning: {Agents_Rules_Path} not found.")

    conn.commit()
    conn.close()
    print("Rule injection complete.")

if __name__ == "__main__":
    inject_rules()
