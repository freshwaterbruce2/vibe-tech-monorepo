
import sqlite3
import sys

DB_PATH = r"D:\databases\crypto_enhanced.db"

def query_db(sql_query):
    # SAFETY CHECK: READ-ONLY ENFORCEMENT
    if not sql_query.strip().upper().startswith("SELECT"):
        print("SECURITY ALERT: Only SELECT queries are permitted.")
        sys.exit(1)

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(sql_query)
        rows = cursor.fetchall()

        results = [dict(row) for row in rows]

        # Format output for LLM consumption
        if not results:
            print("No results found.")
        else:
            for row in results:
                print(row)

        conn.close()
    except Exception as e:
        print(f"Database Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python query_crypto_db.py \"<SELECT_QUERY>\"")
        sys.exit(1)

    query_db(sys.argv[1])
