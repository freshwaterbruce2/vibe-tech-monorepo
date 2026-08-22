import os
import platform
from pathlib import Path


def get_platform_data_root() -> Path:
    r"""Get platform-specific data root directory.

    On Windows this returns ``D:\data\vibe-justice`` (the per-app data
    namespace). ``D:\learning-system`` is reserved for the cross-agent
    learning store and must not be used for per-app data.
    """
    system = platform.system()

    if system == "Windows":
        # Windows: primary is D:\data\vibe-justice (per monorepo paths policy).
        d_drive = Path("D:/data/vibe-justice")
        if d_drive.parent.exists():
            return d_drive
        # Fallback to User Profile ONLY if D: is missing
        return Path.home() / "AppData" / "Local" / "VibeJustice"

    elif system == "Darwin":  # macOS
        return Path.home() / "Library" / "Application Support" / "VibeJustice"

    else:  # Linux/Unix
        return Path.home() / ".local" / "share" / "vibe-justice"


def get_data_directory() -> Path:
    """Get data directory with environment override support"""
    # Priority 1: Environment override
    override = os.getenv("VIBE_JUSTICE_DATA_DIR")
    if override:
        data_dir = Path(override)
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir

    # Priority 2: Standard Vibe hierarchy
    data_dir = get_platform_data_root()

    # Create if doesn't exist
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_cases_directory() -> Path:
    r"""Get cases directory in D:\learning-system"""
    cases_dir = get_data_directory() / "cases"
    cases_dir.mkdir(parents=True, exist_ok=True)
    return cases_dir


def get_log_directory() -> Path:
    r"""Get platform-specific log directory (Strictly D:\logs)"""
    override = os.getenv("VIBE_JUSTICE_LOG_DIR")
    if override:
        log_dir = Path(override)
        log_dir.mkdir(parents=True, exist_ok=True)
        return log_dir

    system = platform.system()

    if system == "Windows":
        # Strictly D:\logs per user rules
        log_dir = Path("D:/logs/vibe-justice")
        if not log_dir.parent.exists():
            # Fallback to local app data if D: is totally missing
            log_dir = Path.home() / "AppData" / "Local" / "VibeJustice" / "logs"
    else:
        log_dir = Path.home() / ".local" / "log" / "vibe-justice"

    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_chroma_directory() -> Path:
    """Get ChromaDB/vector database directory"""
    override = os.getenv("VIBE_JUSTICE_CHROMA_DIR")
    if override:
        chroma_dir = Path(override)
        chroma_dir.mkdir(parents=True, exist_ok=True)
        return chroma_dir

    chroma_dir = get_data_directory() / "chroma"
    chroma_dir.mkdir(parents=True, exist_ok=True)
    return chroma_dir


def _filesystem_database_path() -> str | None:
    """Return DATABASE_PATH when it is a real filesystem location.

    CI sets DATABASE_PATH=:memory: to avoid a developer-machine path. That
    sentinel is not a directory; treating Path(':memory:').parent as '.'
    makes every test share ./vibe_justice.sqlite3 and then fail-closed when
    a later test looks for legal-pack snapshots under a new tmp data dir.
    """
    database_path = os.getenv("DATABASE_PATH")
    if not database_path:
        return None
    raw = database_path
    if raw.startswith("sqlite:///"):
        raw = raw[len("sqlite:///"):]
    if raw in {":memory:", "memory:"} or raw.endswith(":memory:"):
        return None
    return raw


def get_database_directory() -> Path:
    r"""
    Get SQLite database directory (Strictly D:\databases per monorepo rules).

    Environment Variables:
        DATABASE_PATH: Full path to a specific DB file. When set, its parent
                       directory is used. Highest priority (monorepo standard).
        VIBE_JUSTICE_DB_DIR: Override database directory location.

    Returns:
        Path to database directory (D:\databases\vibe-justice on Windows)
    """
    # Priority 1: DATABASE_PATH (monorepo-standard env var)
    raw = _filesystem_database_path()
    if raw:
        parent = Path(raw).parent
        parent.mkdir(parents=True, exist_ok=True)
        return parent

    # Priority 2: legacy per-app override
    override = os.getenv("VIBE_JUSTICE_DB_DIR")
    if override:
        db_dir = Path(override)
        db_dir.mkdir(parents=True, exist_ok=True)
        return db_dir

    # Default relational storage shares the canonical application-data root.
    # DATABASE_PATH and VIBE_JUSTICE_DB_DIR remain explicit compatibility overrides.
    db_dir = get_data_directory()
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir


def get_database_path(db_name: str = "vibe_justice.sqlite3") -> Path:
    """
    Get path to a specific SQLite database file.

    If the ``DATABASE_PATH`` environment variable is set and points to a
    file (not just a directory), it takes priority and is returned verbatim.
    Otherwise the path is resolved under ``get_database_directory()``.

    Args:
        db_name: Database filename (default: vibe_justice.db)

    Returns:
        Full path to the database file
    """
    raw = _filesystem_database_path()
    if raw:
        candidate = Path(raw)
        # Treat entries that look like file paths (have a suffix) as complete.
        if candidate.suffix:
            candidate.parent.mkdir(parents=True, exist_ok=True)
            return candidate

    return get_database_directory() / db_name


# Verify write permissions on startup
def resolve_contained_path(root: Path, filename: str) -> Path:
    """Resolve a filename below root and reject traversal or absolute paths."""
    candidate_name = (filename or "").strip()
    if not candidate_name or Path(candidate_name).name != candidate_name:
        raise ValueError("Invalid filename")
    resolved_root = root.resolve()
    candidate = (resolved_root / candidate_name).resolve()
    if candidate.parent != resolved_root:
        raise ValueError("Invalid filename")
    return candidate


def verify_permissions():
    """Verify all directories are writable"""
    dirs = [
        ("Data", get_data_directory()),
        ("Cases", get_cases_directory()),
        ("Logs", get_log_directory()),
        ("ChromaDB", get_chroma_directory()),
        ("Database", get_database_directory()),
    ]

    for name, path in dirs:
        if not path.exists():
            try:
                path.mkdir(parents=True, exist_ok=True)
            except OSError as exc:
                raise RuntimeError(f"Cannot create {name} directory: {path}") from exc

        if not os.access(path, os.W_OK):
            raise RuntimeError(f"No write access to {name} directory: {path}")

    print("✅ All directories accessible:")
    for name, path in dirs:
        print(f"   {name}: {path}")
