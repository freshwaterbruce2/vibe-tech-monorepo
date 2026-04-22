import os
import time
import json
from pathlib import Path
from typing import Optional
import uuid
import platform


class FileLock:
    """Cross-platform file locking with timeout"""

    def __init__(self, file_path: Path, timeout: int = 30):
        self.file_path = file_path
        self.lock_path = Path(str(file_path) + ".lock")
        self.timeout = timeout
        self.lock_id = str(uuid.uuid4())

    def acquire(self) -> bool:
        """Try to acquire lock with timeout"""
        start_time = time.time()

        while time.time() - start_time < self.timeout:
            try:
                # Atomic create with exclusive access
                if platform.system() == "Windows":
                    # Windows: Use CREATE_NEW flag
                    fd = os.open(
                        str(self.lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY
                    )
                    os.write(fd, self.lock_id.encode())
                    os.close(fd)
                else:
                    # Unix: Use exclusive create
                    with open(self.lock_path, "x") as f:
                        f.write(self.lock_id)
                return True

            except FileExistsError:
                # Lock exists, check if stale (older than timeout)
                try:
                    lock_age = time.time() - self.lock_path.stat().st_mtime
                    if lock_age > self.timeout:
                        # Stale lock, try to remove and retry
                        self.lock_path.unlink(missing_ok=True)
                        continue
                except:
                    pass

                time.sleep(0.1)  # Wait before retry

        return False  # Timeout reached

    def release(self):
        """Release lock if we own it"""
        try:
            if self.lock_path.exists():
                with open(self.lock_path, "r") as f:
                    if f.read() == self.lock_id:
                        self.lock_path.unlink()
        except:
            pass  # Best effort

    def __enter__(self):
        if not self.acquire():
            raise TimeoutError(f"Could not acquire lock for {self.file_path}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()