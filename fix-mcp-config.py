#!/usr/bin/env python3
"""Fix Claude Desktop MCP Server Configuration"""

import json
import shutil
from pathlib import Path
from datetime import datetime

# Paths
config_path = Path.home() / "AppData/Roaming/Claude/claude_desktop_config.json"
backup_path = config_path.with_suffix(f".json.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

print("Fixing Claude Desktop MCP configuration...")

# Backup
shutil.copy2(config_path, backup_path)
print(f"[OK] Backup created: {backup_path}")

# Load config
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Fix 1: Update npx.cmd paths
correct_npx_path = r"C:\Users\fresh_zxae3v6\AppData\Roaming\npm\npx.cmd"
npx_servers = ['filesystem', 'nx-mcp', 'sqlite', 'sqlite-trading', 'playwright']

print("\nFixing npx.cmd paths...")
for server in npx_servers:
    if server in config['mcpServers']:
        old_path = config['mcpServers'][server]['command']
        config['mcpServers'][server]['command'] = correct_npx_path
        print(f"  {server}: [OK]")

# Fix 2: Clean up malformed PATH
print("\nFixing PATH environment variables...")
for server_name, server in config['mcpServers'].items():
    if 'env' in server and 'PATH' in server['env']:
        old_path = server['env']['PATH']
        # Remove leading single quote if present
        new_path = old_path.lstrip("'")
        if old_path != new_path:
            server['env']['PATH'] = new_path
            print(f"  {server_name}: Removed leading quote")

# Save fixed config
with open(config_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("\n[OK] Configuration fixed and saved")
print("\nNext steps:")
print("1. Restart Claude Desktop")
print("2. Check if MCP servers connect successfully")
