"""Tests for configured runtime path helpers."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from runtime_paths import connect_read_only_db, resolve_db_path, sqlite_readonly_uri


class FakeConfig:
    def __init__(self, db_path: str):
        self.db_path = db_path


def test_resolve_db_path_uses_configured_path(tmp_path: Path):
    db_path = tmp_path / "configured" / "trading.db"

    assert resolve_db_path(FakeConfig(str(db_path))) == db_path.resolve()


def test_connect_read_only_db_does_not_create_missing_database(tmp_path: Path):
    db_path = tmp_path / "missing.db"

    with pytest.raises(FileNotFoundError):
        connect_read_only_db(db_path)

    assert not db_path.exists()


def test_connect_read_only_db_rejects_writes(tmp_path: Path):
    db_path = tmp_path / "trading.db"
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, status TEXT)")
    conn.commit()
    conn.close()

    readonly = connect_read_only_db(db_path)
    try:
        assert readonly.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 0
        with pytest.raises(sqlite3.OperationalError):
            readonly.execute("INSERT INTO orders (status) VALUES ('open')")
    finally:
        readonly.close()


def test_sqlite_readonly_uri_uses_mode_ro(tmp_path: Path):
    db_path = tmp_path / "trading.db"

    assert sqlite_readonly_uri(db_path).endswith("?mode=ro")
