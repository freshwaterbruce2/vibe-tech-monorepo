import sqlite3
conn = sqlite3.connect(r'D:\databases\crypto-enhanced\trading.db')
cursor = conn.cursor()

# Check orders schema
cursor.execute("PRAGMA table_info(orders)")
print("Orders columns:", [row[1] for row in cursor.fetchall()])

# Get sample orders
cursor.execute("SELECT * FROM orders LIMIT 5")
rows = cursor.fetchall()
print(f"\nSample orders ({len(rows)} shown):")
for row in rows:
    print(row)

# Get summary by status
cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status")
print("\nOrders by status:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Get date range
cursor.execute("SELECT MIN(created_at), MAX(created_at) FROM orders")
dates = cursor.fetchone()
print(f"\nDate range: {dates[0]} to {dates[1]}")

conn.close()
