import sqlite3

AGENT = r"D:\databases\agent_learning.db"
NOVA = r"D:\databases\nova_shared.db"

print("=" * 60)
print("  POST-MIGRATION VERIFICATION")
print("=" * 60)

print("\n--- agent_learning.db (canonical) ---")
conn = sqlite3.connect(AGENT)
tables = [r[0] for r in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).fetchall() if not r[0].startswith("sqlite_")]
for t in tables:
    c = conn.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
    print(f"  {t}: {c}")
conn.close()

print("\n--- nova_shared.db (trading + nova app data, learning tables DROPPED) ---")
conn = sqlite3.connect(NOVA)
tables = [r[0] for r in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).fetchall() if not r[0].startswith("sqlite_")]
remaining_learning = [t for t in tables if any(kw in t for kw in ["learn", "pattern", "execution", "mistake"])]
print(f"  Remaining learning/pattern tables: {remaining_learning}")
print(f"  Total tables: {len(tables)}")
conn.close()

print("\n--- File sizes ---")
import os
for p in [AGENT, NOVA]:
    size_mb = os.path.getsize(p) / (1024 * 1024)
    print(f"  {p}: {size_mb:.2f} MB")
