import os
import platform
import sys
from pathlib import Path


def get_platform_data_root() -> Path:
    """Get platform-specific data root directory (Strictly D: for data)"""
    system = platform.system()

    if system == "Windows":
        # Windows: Primary is strictly D:\learning-system
        d_drive = Path("D:/learning-system")
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
        return Path(override)

    # Priority 2: Standard Vibe hierarchy
    root = get_platform_data_root()
    data_dir = root / "vibe-justice"

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
        return Path(override)

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
        return Path(override)

    chroma_dir = get_data_directory() / "chroma"
    chroma_dir.mkdir(parents=True, exist_ok=True)
    return chroma_dir


def get_database_directory() -> Path:
    r"""
    Get SQLite database directory (Strictly D:\databases per monorepo rules).

    Environment Variables:
        VIBE_JUSTICE_DB_DIR: Override database directory location

    Returns:
        Path to database directory (D:\databases\vibe-justice on Windows)
    """
    override = os.getenv("VIBE_JUSTICE_DB_DIR")
    if override:
        return Path(override)

    system = platform.system()

    if system == "Windows":
        # Strictly D:\databases per monorepo rules
        db_dir = Path("D:/databases/vibe-justice")
        if not db_dir.parent.exists():
            # Fallback to local app data if D: is totally missing
            db_dir = Path.home() / "AppData" / "Local" / "VibeJustice" / "databases"
    else:
        db_dir = Path.home() / ".local" / "share" / "vibe-justice" / "db"

    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir


def get_database_path(db_name: str = "vibe_justice.db") -> Path:
    """
    Get path to a specific SQLite database file.

    Args:
        db_name: Database filename (default: vibe_justice.db)

    Returns:
        Full path to the database file
    """
    return get_database_directory() / db_name


# Verify write permissions on startup
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
            except PermissionError:
                print(f"❌ ERROR: Cannot create {name} directory: {path}")
                sys.exit(1)

        if not os.access(path, os.W_OK):
            print(f"❌ ERROR: No write access to {name} directory: {path}")
            sys.exit(1)

    print("✅ All directories accessible:")
    for name, path in dirs:
        print(f"   {name}: {path}")
