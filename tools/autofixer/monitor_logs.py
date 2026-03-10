"""
Log Monitor - Watcher for Gemini Autofixer

Watches a log file and alerts the user when errors are detected.
Does NOT fix errors automatically - delegates to Gemini.

Usage:
    python tools/autofixer/monitor_logs.py --log-file vite.log
"""

import sys
import time
import subprocess
import argparse
import json
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from rich.console import Console
from rich.panel import Panel

console = Console()

class LogWatcher(FileSystemEventHandler):
    def __init__(self, log_file, project_root):
        self.log_file = str(Path(log_file).absolute())
        self.project_root = project_root
        self.last_check = 0
        self.check_interval = 2.0

    def on_modified(self, event):
        if Path(event.src_path).absolute() != Path(self.log_file):
            return

        if time.time() - self.last_check < self.check_interval:
            return
        
        self.last_check = time.time()
        self.analyze()

    def analyze(self):
        try:
            # Run the analyzer tool
            cmd = [
                sys.executable, 
                "tools/autofixer/main.py",
                "--log-file", self.log_file,
                "--project-root", self.project_root
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            output = json.loads(result.stdout)
            
            count = output.get("error_count", 0)
            if count > 0:
                console.print("\n")
                console.print(Panel(
                    f"[red]Detected {count} new error(s)![/red]\n\n"
                    f"To fix these, ask Gemini:\n"
                    f"[bold green]@autofixer fix errors in {Path(self.log_file).name}[/bold green]",
                    title="Autofixer Alert",
                    border_style="red"
                ))
                
                # Show brief summary of first error
                first = output["errors"][0]
                console.print(f"[yellow]> {first.get('message')}[/yellow]")
                console.print(f"  at {first.get('file_path')}:{first.get('line_number')}")

        except Exception as e:
            pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--log-file', required=True)
    parser.add_argument('--project-root', default='.')
    args = parser.parse_args()

    if not Path(args.log_file).exists():
        console.print(f"[red]Log file not found: {args.log_file}[/red]")
        sys.exit(1)

    observer = Observer()
    handler = LogWatcher(args.log_file, args.project_root)
    
    log_dir = str(Path(args.log_file).parent.absolute())
    observer.schedule(handler, log_dir, recursive=False)
    observer.start()

    console.print(Panel(
        f"Watching {args.log_file}\n"
        "I will alert you when errors appear.",
        title="Autofixer Watcher",
        border_style="blue"
    ))

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()