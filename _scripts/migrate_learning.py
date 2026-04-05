"""
Migrate learning tables from nova_shared.db -> agent_learning.db
- Overlapping tables: transform to agent_learning schema, preserve extras in metadata JSON
- Nova-only tables: copy as-is (schema + data)
- Trading tables: SKIP (different domain, stay in nova_shared)

Usage:
    python migrate_learning.py --dry-run   (default, no writes)
    python migrate_learning.py --execute   (actually migrate + drop from nova)
"""
import sqlite3
import json
import sys
from datetime import datetime

NOVA = r"D:\databases\nova_shared.db"
AGENT = r"D:\databases\agent_learning.db"

# Nova-only tables to copy as-is (preserve full schema)
COPY_AS_IS = [
    "agent_learning_sessions",
    "agent_patterns",
    "learning_patterns",
    "knowledge_patterns",
    "context_patterns",
    "learning_effectiveness",
    "learning_sync_events",
    "ralph_success_patterns",
]

# Tables to transform to agent_learning schema
TRANSFORM = [
    "agent_executions",
    "agent_mistakes",
    "success_patterns",
    "learning_events",
    "task_patterns",
    # task_mistakes: both 0 rows, skip
]

# Tables to leave in nova_shared (trading domain)
SKIP = ["trading_executions", "trading_patterns", "task_mistakes"]


def get_agent_name_map(nova_conn):
    """Build agent_id (int) -> agent_name (text) lookup from nova's agent_registry"""
    try:
        rows = nova_conn.execute("SELECT id, agent_name FROM agent_registry").fetchall()
        return {r[0]: r[1] for r in rows}
    except sqlite3.OperationalError:
        return {}


def transform_agent_executions(nova_conn, agent_conn, name_map, dry_run):
    """Transform nova agent_executions -> agent_learning format"""
    rows = nova_conn.execute("""
        SELECT id, agent_id, agent_name, project_name, task_type, task_description,
               user_request, status, execution_time_seconds, execution_time, tools_used,
               success_score, success, user_satisfaction, output_quality, efficiency_rating,
               error_details, user_feedback, execution_context, executed_at, tokens_used,
               project_type, monorepo_location, tools_sequence
        FROM agent_executions
    """).fetchall()

    inserted = 0
    for r in rows:
        (id_, agent_id_int, agent_name, project_name, task_type, task_desc,
         user_req, status, exec_sec, exec_time, tools, success_score, success,
         user_sat, out_qual, eff, error_det, user_fb, exec_ctx, executed_at,
         tokens, proj_type, monorepo_loc, tools_seq) = r

        # Resolve agent name
        resolved_name = agent_name or name_map.get(agent_id_int) or f"unknown-{agent_id_int}"

        # Compute success boolean
        if success is not None:
            success_bool = bool(success)
        elif status:
            success_bool = status.lower() in ("success", "completed", "ok")
        elif success_score is not None:
            success_bool = success_score >= 0.5
        else:
            success_bool = False

        # Compute execution_time_ms
        exec_ms = None
        if exec_time is not None:
            exec_ms = int(exec_time * 1000)
        elif exec_sec is not None:
            exec_ms = int(exec_sec * 1000)

        # Context: combine user_request + task_description + execution_context
        ctx_parts = []
        if user_req: ctx_parts.append(f"Request: {user_req}")
        if task_desc: ctx_parts.append(f"Task: {task_desc}")
        if exec_ctx: ctx_parts.append(exec_ctx)
        context = "\n".join(ctx_parts) if ctx_parts else None

        # Extras in metadata
        extras = {
            "nova_id": id_,
            "status": status,
            "success_score": success_score,
            "user_satisfaction": user_sat,
            "output_quality": out_qual,
            "efficiency_rating": eff,
            "user_feedback": user_fb,
            "tokens_used": tokens,
            "project_type": proj_type,
            "monorepo_location": monorepo_loc,
            "tools_sequence": tools_seq,
        }
        extras = {k: v for k, v in extras.items() if v is not None}
        metadata = json.dumps(extras) if extras else None

        exec_id = f"nova-{id_}-{executed_at or 'unknown'}"
        started_at = executed_at or datetime.now().isoformat()
        error_msg = error_det

        if not dry_run:
            try:
                agent_conn.execute("""
                    INSERT OR IGNORE INTO agent_executions
                    (execution_id, agent_id, task_type, tools_used, started_at,
                     success, execution_time_ms, error_message, metadata, context, project_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (exec_id, resolved_name, task_type, tools, started_at,
                      1 if success_bool else 0, exec_ms, error_msg, metadata, context, project_name))
                inserted += 1
            except sqlite3.IntegrityError as e:
                print(f"  SKIP exec {id_}: {e}")
        else:
            inserted += 1

    return inserted


def transform_agent_mistakes(nova_conn, agent_conn, name_map, dry_run):
    rows = nova_conn.execute("""
        SELECT id, execution_id, agent_id, mistake_type, description, severity,
               frequency, root_cause, prevention_strategy, mistake_context,
               identified_at, resolved_at
        FROM agent_mistakes
    """).fetchall()

    inserted = 0
    for r in rows:
        (id_, exec_id, agent_id, mtype, desc, severity, freq, root_cause,
         prevention, mistake_ctx, identified, resolved) = r

        if not desc:
            continue  # NOT NULL in agent_learning

        # Map severity -> impact_severity
        impact = severity or "medium"
        resolved_flag = 1 if resolved else 0
        identified_at = identified or datetime.now().isoformat()

        if not dry_run:
            try:
                agent_conn.execute("""
                    INSERT INTO agent_mistakes
                    (mistake_type, description, root_cause_analysis, context_when_occurred,
                     impact_severity, prevention_strategy, identified_at, resolved)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (mtype, desc, root_cause, mistake_ctx, impact, prevention,
                      identified_at, resolved_flag))
                inserted += 1
            except sqlite3.Error as e:
                print(f"  SKIP mistake {id_}: {e}")
        else:
            inserted += 1

    return inserted


def transform_success_patterns(nova_conn, agent_conn, dry_run):
    rows = nova_conn.execute("""
        SELECT id, pattern_hash, task_type, project_name, tools_used, approach,
               success_count, avg_execution_time, avg_token_usage, confidence_score,
               created_at, last_used, metadata
        FROM success_patterns
    """).fetchall()

    inserted = 0
    for r in rows:
        (id_, phash, task_type, proj, tools, approach, succ_count, avg_time,
         avg_tokens, conf, created, last_used, meta_json) = r

        # pattern_type = task_type, description = approach
        ptype = task_type or "unknown"
        pdesc = approach or f"[{phash}]" or "(no approach)"

        # Merge extras into metadata
        extras = {
            "nova_pattern_hash": phash,
            "project_name": proj,
            "tools_used": tools,
            "avg_execution_time": avg_time,
            "avg_token_usage": avg_tokens,
        }
        try:
            existing = json.loads(meta_json) if meta_json else {}
        except (json.JSONDecodeError, TypeError):
            existing = {}
        merged = {**existing, **{k: v for k, v in extras.items() if v is not None}}
        metadata = json.dumps(merged) if merged else None

        freq = succ_count or 1
        conf_score = conf or 0.5
        created_at = created or datetime.now().isoformat()

        if not dry_run:
            try:
                # Check if already exists (by pattern_type + description)
                exists = agent_conn.execute(
                    "SELECT id FROM success_patterns WHERE pattern_type=? AND description=?",
                    (ptype, pdesc)
                ).fetchone()
                if exists:
                    agent_conn.execute("""
                        UPDATE success_patterns
                        SET frequency = frequency + ?, confidence_score = MAX(confidence_score, ?),
                            last_used = COALESCE(?, last_used), metadata = COALESCE(?, metadata)
                        WHERE id = ?
                    """, (freq, conf_score, last_used, metadata, exists[0]))
                else:
                    agent_conn.execute("""
                        INSERT INTO success_patterns
                        (pattern_type, description, frequency, confidence_score, created_at, last_used, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (ptype, pdesc, freq, conf_score, created_at, last_used, metadata))
                inserted += 1
            except sqlite3.Error as e:
                print(f"  SKIP pattern {id_}: {e}")
        else:
            inserted += 1

    return inserted


def transform_learning_events(nova_conn, agent_conn, dry_run):
    rows = nova_conn.execute("""
        SELECT event_type, app_source, project_id, session_id, title, description,
               status, outcome, metadata, created_at
        FROM learning_events
    """).fetchall()

    inserted = 0
    for r in rows:
        (etype, app_src, proj_id, sess_id, title, desc, status, outcome,
         meta_json, created_at) = r

        if not title or not desc:
            continue  # NOT NULL

        # agent_learning.learning_events requires: title, description, outcome, app_source, created_at
        # app_source must be 'nova' or 'vibe'
        app = app_src if app_src in ("nova", "vibe") else "nova"
        outcome_val = outcome or status or "unknown"

        try:
            existing = json.loads(meta_json) if meta_json else {}
        except (json.JSONDecodeError, TypeError):
            existing = {}
        extras = {
            "event_type": etype,
            "project_id": proj_id,
            "session_id": sess_id,
            "status": status,
        }
        merged = {**existing, **{k: v for k, v in extras.items() if v}}
        metadata = json.dumps(merged) if merged else None

        # Convert created_at to INTEGER timestamp if needed
        if isinstance(created_at, str):
            try:
                ts = int(datetime.fromisoformat(created_at).timestamp())
            except ValueError:
                ts = int(datetime.now().timestamp())
        elif isinstance(created_at, (int, float)):
            ts = int(created_at)
        else:
            ts = int(datetime.now().timestamp())

        if not dry_run:
            try:
                agent_conn.execute("""
                    INSERT INTO learning_events
                    (title, description, outcome, app_source, created_at, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (title, desc, outcome_val, app, ts, metadata))
                inserted += 1
            except sqlite3.Error as e:
                print(f"  SKIP event '{title}': {e}")
        else:
            inserted += 1

    return inserted


def transform_task_patterns(nova_conn, agent_conn, dry_run):
    rows = nova_conn.execute("""
        SELECT pattern_name, pattern_type, description, frequency, avg_completion_time,
               success_rate, common_blockers, recommended_approach, example_task_ids,
               created_at, updated_at
        FROM task_patterns
    """).fetchall()

    inserted = 0
    for r in rows:
        (name, ptype, desc, freq, avg_time, succ_rate, blockers, approach,
         examples, created, updated) = r

        # agent_learning.task_patterns: id, pattern_type, frequency, recommended_approach, created_at
        if not ptype:
            ptype = "unknown"

        if not dry_run:
            try:
                agent_conn.execute("""
                    INSERT INTO task_patterns
                    (pattern_type, frequency, recommended_approach)
                    VALUES (?, ?, ?)
                """, (ptype, freq or 0, approach or desc))
                inserted += 1
            except sqlite3.Error as e:
                print(f"  SKIP task_pattern '{name}': {e}")
        else:
            inserted += 1

    return inserted


def copy_table_as_is(nova_conn, agent_conn, table, dry_run):
    """Copy table schema + data from nova to agent_learning"""
    # Check if table already exists in agent_learning
    exists = agent_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()

    if not exists:
        # Get CREATE TABLE from nova
        schema_row = nova_conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()
        if not schema_row:
            print(f"  Table {table} not found in nova")
            return 0
        create_sql = schema_row[0]

        if not dry_run:
            try:
                agent_conn.execute(create_sql)
            except sqlite3.Error as e:
                print(f"  FAIL create {table}: {e}")
                return 0
        print(f"  Created table {table} in agent_learning.db")

    # Copy rows
    rows = nova_conn.execute(f"SELECT * FROM [{table}]").fetchall()
    if not rows:
        return 0

    col_count = len(rows[0])
    placeholders = ",".join(["?"] * col_count)

    inserted = 0
    if not dry_run:
        try:
            agent_conn.executemany(
                f"INSERT OR IGNORE INTO [{table}] VALUES ({placeholders})",
                rows
            )
            inserted = len(rows)
        except sqlite3.Error as e:
            print(f"  FAIL copy {table}: {e}")
            return 0
    else:
        inserted = len(rows)

    return inserted


def drop_from_nova(nova_conn, tables, dry_run):
    """Drop migrated tables from nova_shared.db"""
    dropped = []
    for t in tables:
        if not dry_run:
            try:
                nova_conn.execute(f"DROP TABLE IF EXISTS [{t}]")
                dropped.append(t)
            except sqlite3.Error as e:
                print(f"  FAIL drop {t}: {e}")
        else:
            dropped.append(t)
    return dropped


def main():
    dry_run = "--execute" not in sys.argv
    mode = "DRY RUN" if dry_run else "EXECUTE"
    print(f"\n{'='*60}\n  LEARNING MIGRATION — {mode}\n{'='*60}\n")

    nova_conn = sqlite3.connect(NOVA)
    agent_conn = sqlite3.connect(AGENT)
    agent_conn.execute("PRAGMA journal_mode = WAL")
    agent_conn.execute("PRAGMA foreign_keys = OFF")

    name_map = get_agent_name_map(nova_conn)
    print(f"Found {len(name_map)} agents in nova agent_registry\n")

    results = {}

    print("--- Transform (schema-mapped) ---")
    results["agent_executions"] = transform_agent_executions(nova_conn, agent_conn, name_map, dry_run)
    print(f"  agent_executions: {results['agent_executions']}")
    results["agent_mistakes"] = transform_agent_mistakes(nova_conn, agent_conn, name_map, dry_run)
    print(f"  agent_mistakes: {results['agent_mistakes']}")
    results["success_patterns"] = transform_success_patterns(nova_conn, agent_conn, dry_run)
    print(f"  success_patterns: {results['success_patterns']}")
    results["learning_events"] = transform_learning_events(nova_conn, agent_conn, dry_run)
    print(f"  learning_events: {results['learning_events']}")
    results["task_patterns"] = transform_task_patterns(nova_conn, agent_conn, dry_run)
    print(f"  task_patterns: {results['task_patterns']}")

    print("\n--- Copy as-is (schema + data) ---")
    for t in COPY_AS_IS:
        n = copy_table_as_is(nova_conn, agent_conn, t, dry_run)
        results[t] = n
        print(f"  {t}: {n}")

    if not dry_run:
        agent_conn.commit()
        print("\n--- Dropping migrated tables from nova_shared.db ---")
        tables_to_drop = TRANSFORM + COPY_AS_IS
        dropped = drop_from_nova(nova_conn, tables_to_drop, dry_run)
        nova_conn.commit()
        print(f"  Dropped {len(dropped)}: {', '.join(dropped)}")

        # VACUUM nova_shared.db to reclaim space
        print("\n--- VACUUM nova_shared.db ---")
        nova_conn.execute("VACUUM")
        print("  Done")

    total = sum(results.values())
    print(f"\n{'='*60}\n  TOTAL rows migrated: {total}\n{'='*60}\n")

    if dry_run:
        print(">>> DRY RUN — no changes written. Re-run with --execute to commit.\n")

    nova_conn.close()
    agent_conn.close()


if __name__ == "__main__":
    main()
