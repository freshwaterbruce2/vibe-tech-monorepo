"""Synthetic acceptance for canonical database ownership and migrations."""

from __future__ import annotations

import sqlite3
import os
from pathlib import Path
import subprocess
import sys

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect

from vibe_justice.utils import database
from vibe_justice.utils.paths import get_database_path


EXPECTED_TABLES = {
    "evidence_records", "extraction_attempts", "evidence_chunks",
    "legal_packs", "legal_sources", "legal_rule_elements",
    "issue_analysis_runs", "issue_findings", "finding_citations",
    "finding_missing_facts", "finding_qualifications", "finding_dispositions",
    "alembic_version",
}


def _set_database(monkeypatch, path):
    monkeypatch.setenv("DATABASE_PATH", str(path))
    monkeypatch.delenv("VIBE_JUSTICE_DATA_DIR", raising=False)


def test_default_database_is_under_canonical_data_root(monkeypatch, tmp_path):
    monkeypatch.delenv("DATABASE_PATH", raising=False)
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(tmp_path))
    assert get_database_path() == tmp_path / "vibe_justice.sqlite3"


@pytest.mark.parametrize("sentinel", (":memory:", "sqlite:///:memory:"))
def test_memory_database_path_does_not_escape_data_root(monkeypatch, tmp_path, sentinel):
    monkeypatch.setenv("DATABASE_PATH", sentinel)
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(tmp_path))
    assert get_database_path() == tmp_path / "vibe_justice.sqlite3"


def test_blank_database_upgrades_to_current_schema(monkeypatch, tmp_path):
    path = tmp_path / "blank.sqlite3"
    _set_database(monkeypatch, path)

    database.upgrade_database()

    inspector = inspect(create_engine(database.get_database_url()))
    assert EXPECTED_TABLES <= set(inspector.get_table_names())
    assert "text_sha256" in {column["name"] for column in inspector.get_columns("extraction_attempts")}
    assert "ix_chunk_case_evidence_ordinal" in {
        index["name"] for index in inspector.get_indexes("evidence_chunks")
    }
    assert "uq_finding_disposition_version_idx" in {
        index["name"] for index in inspector.get_indexes("finding_dispositions")
    }
    with sqlite3.connect(path) as connection:
        revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    assert revision == ScriptDirectory.from_config(config).get_current_head()


def test_representative_legacy_database_is_upgraded_without_data_loss(monkeypatch, tmp_path):
    path = tmp_path / "legacy.sqlite3"
    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            CREATE TABLE evidence_records (
                evidence_id VARCHAR(36) PRIMARY KEY,
                case_id VARCHAR(64) NOT NULL,
                display_filename VARCHAR(255) NOT NULL,
                original_path VARCHAR(600) NOT NULL,
                byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
                sha256 VARCHAR(64) NOT NULL,
                declared_mime VARCHAR(255),
                detected_mime VARCHAR(120) NOT NULL,
                detected_type VARCHAR(20) NOT NULL,
                imported_at DATETIME NOT NULL,
                source_label VARCHAR(200) NOT NULL,
                received_from VARCHAR(500),
                notes VARCHAR(4000),
                evidence_date DATETIME,
                status VARCHAR(32) NOT NULL,
                error_code VARCHAR(64),
                error_message VARCHAR(500),
                same_content_as VARCHAR(36),
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            );
            CREATE TABLE extraction_attempts (
                attempt_id VARCHAR(36) PRIMARY KEY,
                evidence_id VARCHAR(36) NOT NULL,
                extractor_name VARCHAR(100) NOT NULL,
                extractor_version VARCHAR(50) NOT NULL,
                started_at DATETIME NOT NULL,
                status VARCHAR(32) NOT NULL
            );
            INSERT INTO extraction_attempts VALUES
                ('attempt-1', 'evidence-1', 'legacy', '1', '2026-01-01', 'succeeded');
            """
        )
    _set_database(monkeypatch, path)

    database.upgrade_database()

    with sqlite3.connect(path) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(extraction_attempts)")}
        row = connection.execute(
            "SELECT attempt_id, extractor_name, text_sha256 FROM extraction_attempts"
        ).fetchone()
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "text_sha256" in columns
    assert row == ("attempt-1", "legacy", None)
    assert EXPECTED_TABLES <= tables


def test_database_path_accepts_raw_and_sqlite_url_overrides(monkeypatch, tmp_path):
    raw = tmp_path / "raw.sqlite3"
    monkeypatch.setenv("DATABASE_PATH", str(raw))
    assert get_database_path() == raw
    url_path = tmp_path / "url.sqlite3"
    monkeypatch.setenv("DATABASE_PATH", f"sqlite:///{url_path.as_posix()}")
    assert get_database_path() == url_path


def test_runtime_engine_applies_sqlite_pragmas(monkeypatch, tmp_path):
    _set_database(monkeypatch, tmp_path / "pragmas.sqlite3")
    engine = database.create_runtime_engine()
    with engine.connect() as connection:
        assert connection.exec_driver_sql("PRAGMA journal_mode").scalar().lower() == "wal"
        assert connection.exec_driver_sql("PRAGMA busy_timeout").scalar() == 5000
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1


def test_same_path_replacement_is_not_skipped(monkeypatch, tmp_path):
    path = tmp_path / "restored.sqlite3"
    _set_database(monkeypatch, path)
    database.upgrade_database()
    path.unlink()
    sqlite3.connect(path).close()
    database.upgrade_database()
    with sqlite3.connect(path) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert EXPECTED_TABLES <= tables


def test_failed_upgrade_releases_lock_and_can_retry(monkeypatch, tmp_path):
    path = tmp_path / "retry.sqlite3"
    _set_database(monkeypatch, path)
    real_upgrade = database.command.upgrade
    monkeypatch.setattr(database.command, "upgrade", lambda *_: (_ for _ in ()).throw(RuntimeError("injected")))
    with pytest.raises(RuntimeError, match="injected"):
        database.upgrade_database()
    monkeypatch.setattr(database.command, "upgrade", real_upgrade)
    database.upgrade_database()
    assert EXPECTED_TABLES <= set(inspect(create_engine(database.get_database_url())).get_table_names())


def test_two_processes_can_upgrade_same_database(tmp_path):
    path = tmp_path / "concurrent.sqlite3"
    backend = Path(__file__).resolve().parents[2]
    code = "from vibe_justice.utils.database import upgrade_database; upgrade_database()"
    env = os.environ.copy()
    env["DATABASE_PATH"] = str(path)
    env["PYTHONPATH"] = str(backend)
    processes = [subprocess.Popen([sys.executable, "-c", code], cwd=backend, env=env) for _ in range(2)]
    assert [process.wait(timeout=60) for process in processes] == [0, 0]
    with sqlite3.connect(path) as connection:
        assert connection.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"
        assert connection.execute("SELECT count(*) FROM alembic_version").fetchone()[0] == 1
