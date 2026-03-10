import sqlite3
import os
import sys
import datetime

# Vibe Learning System Health Check (Python Version)
DB_PATH = r"D:\databases\nova_shared.db"

def check_health():
    print("\033[36m🧠 Vibe Learning System Health Check\033[0m")
    print("=====================================")

    # 1. Check Database File
    if not os.path.exists(DB_PATH):
        print(f"\033[31m[FAIL]\033[0m Database file not found at: {DB_PATH}")
        sys.exit(1)
    print("\033[32m[OK]\033[0m Database file found")

    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        cursor = conn.cursor()

        # 2. Check Connection & Schema
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_executions'")
        if not cursor.fetchone():
            print("\033[31m[FAIL]\033[0m Table 'agent_executions' not found. Schema might be missing.")
            sys.exit(1)
        print("\033[32m[OK]\033[0m Connection & Schema verified")

        # 3. Get Stats
        cursor.execute("SELECT COUNT(*) FROM agent_executions")
        total_executions = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM agent_mistakes")
        total_mistakes = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM success_patterns")
        patterns = cursor.fetchone()[0]

        print("\n📊 Statistics:")
        print(f"- Total Executions: \033[33m{total_executions:,}\033[0m")
        print(f"- Learned Patterns: \033[33m{patterns}\033[0m")
        print(f"- Recorded Mistakes: \033[31m{total_mistakes}\033[0m")

        # 4. Recent Activity
        print("\n🕒 Recent Activity:")
        cursor.execute("""
            SELECT agent_name, task_type, success, execution_time_seconds, executed_at
            FROM agent_executions
            ORDER BY executed_at DESC
            LIMIT 5
        """)

        for row in cursor.fetchall():
            agent_name = row[0]
            task_type = row[1]
            status = "✅" if row[2] else "❌"
            exec_time = f"{row[3]:.2f}s" if row[3] is not None else "N/A"
            time_str = row[4][11:19] if row[4] else "Unknown"
            print(f"  {time_str} {status} [{agent_name}] {task_type} ({exec_time})")

        print("\n\033[32m✅ Learning System is ACTIVE and HEALTHY\033[0m")
        conn.close()

    except Exception as e:
        print(f"\033[31m[ERROR]\033[0m Failed to query database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_health()
