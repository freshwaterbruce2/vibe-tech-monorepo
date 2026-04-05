import glob
import json
import sqlite3

db_files = glob.glob("D:/databases/*.db")
search_term = "kimi-2.5-pro"

for db in db_files:
    try:
        conn = sqlite3.connect(db)
        cursor = conn.cursor()

        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        for table in tables:
            try:
                # Get all columns
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in cursor.fetchall()]

                # Check each column (rudimentary search)
                for col in columns:
                    try:
                        cursor.execute(
                            f"SELECT * FROM {table} WHERE CAST({col} AS TEXT) LIKE ?",
                            ("%" + search_term + "%",),
                        )
                        results = cursor.fetchall()
                        if results:
                            print(
                                f"\\n--- FOUND IN DB: {db} | TABLE: {table} | COL: {col} ---"
                            )
                            for res in results:
                                print(res)
                    except sqlite3.OperationalError:
                        pass
            except Exception as e:
                print(f"Error checking table {table} in {db}: {e}")

        conn.close()
    except Exception as e:
        print(f"Error connecting to {db}: {e}")
