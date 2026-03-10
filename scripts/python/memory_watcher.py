#!/usr/bin/env python3
"""
Memory Sync Watcher - Monitors project changes and syncs to memory bank
"""
import os
import sys
import time
import yaml
import hashlib
import json
import shutil
from pathlib import Path
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import logging

class MemorySyncHandler(FileSystemEventHandler):
    def __init__(self, config_path):
        self.config = self.load_config(config_path)
        self.memory_root = Path(self.config['memory_root'])
        self.change_count = 0
        self.hash_cache = {}
        self.load_hash_cache()
        self.setup_logging()

    def setup_logging(self):
        log_config = self.config.get('logging', {})
        if log_config.get('enabled', True):
            log_file = log_config.get('file', 'D:\\logs\\memory_sync.log')
            logging.basicConfig(
                level=getattr(logging, log_config.get('level', 'INFO')),
                format='%(asctime)s - %(levelname)s - %(message)s',
                handlers=[
                    logging.FileHandler(log_file),
                    logging.StreamHandler()
                ]
            )
            self.logger = logging.getLogger(__name__)
        else:
            self.logger = None

    def log(self, message, level='info'):
        if self.logger:
            getattr(self.logger, level)(message)
        print(message)

    def load_config(self, path):
        with open(path, 'r') as f:
            return yaml.safe_load(f)

    def load_hash_cache(self):
        cache_file = self.memory_root / '.hash_cache.json'
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    self.hash_cache = json.load(f)
            except:
                self.hash_cache = {}

    def save_hash_cache(self):
        cache_file = self.memory_root / '.hash_cache.json'
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_file, 'w') as f:
            json.dump(self.hash_cache, f, indent=2)

    def get_file_hash(self, path):
        try:
            hasher = hashlib.sha256()
            with open(path, 'rb') as f:
                while True:
                    buf = f.read(65536)
                    if not buf:
                        break
                    hasher.update(buf)
            return hasher.hexdigest()
        except Exception as e:
            self.log(f"Error hashing {path}: {e}", 'error')
            return None

    def should_sync(self, src_path):
        src_str = str(src_path).replace('\\', '/')

        # Check global excludes
        for pattern in self.config.get('global_excludes', []):
            if pattern in src_str:
                return False

        # Check file size limit
        max_size = self.config.get('sync_behavior', {}).get('max_file_size', 52428800)
        try:
            if src_path.stat().st_size > max_size:
                return False
        except:
            return False

        return True

    def sync_file(self, src_path, dest_path):
        if not self.should_sync(src_path):
            return False

        # Check if file changed via hash
        current_hash = self.get_file_hash(src_path)
        if not current_hash:
            return False

        cached_hash = self.hash_cache.get(str(src_path))

        if cached_hash == current_hash:
            return False

        try:
            # Copy file
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dest_path)

            # Update hash cache
            self.hash_cache[str(src_path)] = current_hash
            self.save_hash_cache()

            self.log(f"[SYNCED] {src_path.name} -> {dest_path}")
            return True
        except Exception as e:
            self.log(f"[ERROR] Failed to sync {src_path}: {e}", 'error')
            return False

    def on_modified(self, event):
        if event.is_directory:
            return

        src_path = Path(event.src_path)

        # Find matching project
        for project in self.config['projects']:
            project_path = Path(project['path'])
            if str(project_path) in str(src_path):
                try:
                    rel_path = src_path.relative_to(project_path)
                    dest_path = Path(project['dest']) / rel_path

                    if self.sync_file(src_path, dest_path):
                        self.change_count += 1

                        # Auto-commit if threshold reached
                        threshold = self.config.get('auto_commit_threshold', 10)
                        if self.change_count >= threshold:
                            self.auto_commit(project['name'])
                            self.change_count = 0
                except Exception as e:
                    self.log(f"Error processing {src_path}: {e}", 'error')

    def auto_commit(self, project_name):
        if not self.config.get('git_integration', {}).get('auto_commit', True):
            return

        try:
            os.chdir(self.memory_root)
            subprocess.run(['git', 'add', '.'], check=False, capture_output=True)

            commit_msg = self.config['commit_template'].format(
                project=project_name,
                count=self.change_count
            )
            result = subprocess.run(
                ['git', 'commit', '-m', commit_msg],
                check=False,
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                self.log(f"[COMMITTED] {commit_msg}")
            elif "nothing to commit" not in result.stdout:
                self.log(f"Git commit failed: {result.stderr}", 'warning')
        except Exception as e:
            self.log(f"Auto-commit error: {e}", 'error')

def main():
    config_path = r"C:\dev\memory_sync.yaml"

    if not os.path.exists(config_path):
        print(f"âŒ Config file not found: {config_path}")
        sys.exit(1)

    handler = MemorySyncHandler(config_path)
    observer = Observer()

    # Watch all project directories
    config = handler.config
    watched_count = 0

    for project in config['projects']:
        project_path = project['path']
        if os.path.exists(project_path):
            observer.schedule(handler, project_path, recursive=True)
            print(f"[WATCHING] {project['name']} at {project_path}")
            watched_count += 1
        else:
            print(f"[SKIPPED] {project['name']} (path not found: {project_path})")

    # Watch prompt directories
    for prompt in config.get('prompts', []):
        source = prompt.get('source')
        if source and os.path.exists(source):
            observer.schedule(handler, source, recursive=True)
            print(f"[WATCHING] prompts: {prompt['name']} at {source}")
            watched_count += 1

    if watched_count == 0:
        print("[ERROR] No valid directories to watch!")
        sys.exit(1)

    observer.start()
    print(f"\n[ACTIVE] Memory Sync - Watching {watched_count} locations")
    print("   Press Ctrl+C to stop\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n[STOPPED] Memory Sync stopped")
    observer.join()

if __name__ == "__main__":
    main()
