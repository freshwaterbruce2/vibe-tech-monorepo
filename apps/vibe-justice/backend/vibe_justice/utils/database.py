"""Canonical relational database ownership and Alembic initialization."""

from __future__ import annotations

from contextlib import contextmanager
import os
from pathlib import Path
from threading import Lock

from alembic import command
from alembic.config import Config
from sqlalchemy import event
from sqlmodel import create_engine

from vibe_justice.utils.paths import get_database_path

_migration_lock = Lock()


@contextmanager
def _process_migration_lock(database_path: Path):
    """Serialize Alembic across sidecar processes using an adjacent lock file."""
    lock_path = database_path.with_name(f"{database_path.name}.migrate.lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+b") as handle:
        handle.seek(0, os.SEEK_END)
        if handle.tell() == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt

            msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
            try:
                yield
            finally:
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def get_database_url() -> str:
    return f"sqlite:///{get_database_path().resolve().as_posix()}"


def upgrade_database() -> None:
    """Upgrade the canonical runtime database to the current Alembic head."""
    database_path = get_database_path().resolve()
    with _migration_lock:
        with _process_migration_lock(database_path):
            backend_root = Path(__file__).resolve().parents[2]
            config = Config(str(backend_root / "alembic.ini"))
            config.set_main_option("script_location", str(backend_root / "alembic"))
            config.set_main_option("sqlalchemy.url", get_database_url())
            command.upgrade(config, "head")


def create_runtime_engine():
    engine = create_engine(get_database_url(), connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def apply_sqlite_pragmas(connection, _):
        cursor = connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine
