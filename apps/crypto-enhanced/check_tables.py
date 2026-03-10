import sqlite3
conn = sqlite3.connect(r'D:\databases\crypto-enhanced\trading.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables in D:\\databases\\crypto-enhanced\\trading.db:")
for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    count = cursor.fetchone()[0]
    print(f"  - {t}: {count} rows")
conn.close()
