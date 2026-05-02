"""Runtime path helpers for Crypto Enhanced."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

from config import Config


def resolve_db_path(config: Optional[Config] = None) -> Path:
    """Resolve the configured trading database path."""
    active_config = config or Config()
    return Path(active_config.db_path).expanduser().resolve()


def sqlite_readonly_uri(db_path: Path | str) -> str:
    """Build a SQLite URI that refuses to create a missing database."""
    path = Path(db_path).expanduser().resolve()
    return f"file:{path.as_posix()}?mode=ro"


def connect_read_only_db(
    db_path: Optional[Path | str] = None,
    *,
    row_factory=None,
) -> sqlite3.Connection:
    """Open the configured database in read-only mode."""
    resolved_path = Path(db_path).expanduser().resolve() if db_path else resolve_db_path()
    if not resolved_path.exists():
        raise FileNotFoundError(f"Configured trading database not found: {resolved_path}")

    conn = sqlite3.connect(sqlite_readonly_uri(resolved_path), uri=True)
    if row_factory is not None:
        conn.row_factory = row_factory
    return conn
