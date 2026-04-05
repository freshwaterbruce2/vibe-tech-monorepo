import sqlite3

# Tables to migrate from nova_shared -> agent_learning
LEARNING_TABLES = [
    'agent_executions', 'agent_mistakes', 'agent_learning_sessions',
    'agent_patterns', 'learning_patterns', 'knowledge_patterns',
    'success_patterns', 'context_patterns', 'learning_effectiveness',
    'task_mistakes', 'task_patterns', 'learning_sync_events',
    'learning_events', 'ralph_success_patterns',
    # Trading is separate domain - keep in nova_shared
    # 'trading_executions', 'trading_patterns',
]

def get_schema(db_path, table):
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
            (table,)
        ).fetchone()
        return row[0] if row else None
    finally:
        conn.close()

def get_count(db_path, table):
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(f"SELECT COUNT(*) FROM [{table}]").fetchone()
        return row[0]
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

nova = r"D:\databases\nova_shared.db"
agent = r"D:\databases\agent_learning.db"

print(f"{'Table':<30} {'nova rows':>12} {'agent rows':>12} {'schema match':>15}")
print("-" * 75)
for t in LEARNING_TABLES:
    nc = get_count(nova, t)
    ac = get_count(agent, t)
    ns = get_schema(nova, t)
    as_ = get_schema(agent, t)
    if ac is None:
        match = "MISSING_IN_AGENT"
    elif ns == as_:
        match = "IDENTICAL"
    else:
        match = "DIFFERENT"
    print(f"{t:<30} {nc!s:>12} {ac!s:>12} {match:>15}")

# Print schemas for tables where they differ
print("\n\n=== Schema differences ===")
for t in LEARNING_TABLES:
    ns = get_schema(nova, t)
    as_ = get_schema(agent, t)
    if ns and as_ and ns != as_:
        print(f"\n--- {t} ---")
        print(f"NOVA:  {ns}")
        print(f"AGENT: {as_}")
