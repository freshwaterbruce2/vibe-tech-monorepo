import os
import sys
import json
import hashlib
import subprocess

STATE_FILE = r"D:\learning-system\notebooklm_sync_state.json"

MAPS = {
    # 1. Monorepo in general
    "ad17831f-7c56-42ae-9113-1af3b8974135": {
        "name": "Monorepo (General)",
        "files": [
            r"V:\monorepo\WORKSPACE.json",
            r"V:\monorepo\package.json",
            r"V:\monorepo\nx.json",
            r"V:\monorepo\pnpm-workspace.yaml",
            r"V:\monorepo\tsconfig.base.json",
            r"V:\monorepo\docs\canonical-facts.md",
            r"V:\monorepo\docs\DELETION_LOG.md",
            r"V:\monorepo\AGENTS.md",
            r"V:\monorepo\AI.md",
            r"V:\monorepo\GEMINI.md",
            r"V:\monorepo\README.md",
            r"V:\monorepo\SECURITY.md",
            r"V:\monorepo\TASKS.md"
        ]
    },
    # 2. Mobile apps (iOS)
    "0a9ac7bb-45f8-46ef-b3fa-31e510cd997b": {
        "name": "Mobile (iOS)",
        "files": [
            r"V:\monorepo\apps\nova-mobile-app\package.json",
            r"V:\monorepo\apps\nova-mobile-app\app.json",
            r"V:\monorepo\apps\nova-mobile-app\README.md"
        ]
    },
    # 3. Mobile apps (Android)
    "1e388c50-bacb-4f4d-8590-33b52b616d6e": {
        "name": "Mobile (Android)",
        "files": [
            r"V:\monorepo\apps\nova-mobile-app\package.json",
            r"V:\monorepo\apps\nova-mobile-app\app.json",
            r"V:\monorepo\apps\nova-mobile-app\README.md",
            r"V:\monorepo\apps\vibe-tutor-mobile\package.json",
            r"V:\monorepo\apps\vibe-tutor-mobile\README.md",
            r"V:\monorepo\apps\vibe-tutor-mobile\capacitor.config.ts",
            r"V:\monorepo\apps\chessmaster-academy\package.json",
            r"V:\monorepo\apps\chessmaster-academy\README.md",
            r"V:\monorepo\apps\chessmaster-academy\capacitor.config.ts"
        ]
    },
    # 4. Desktop apps on Windows 11
    "6e8e99bc-f2ba-452b-9f9c-363803fecd77": {
        "name": "Desktop (Windows)",
        "files": [
            r"V:\monorepo\apps\nova-agent\package.json",
            r"V:\monorepo\apps\nova-agent\README.md",
            r"V:\monorepo\apps\vibe-code-studio\package.json",
            r"V:\monorepo\apps\vibe-code-studio\README.md",
            r"V:\monorepo\apps\vibetech-command-center\package.json",
            r"V:\monorepo\apps\vibetech-command-center\README.md",
            r"V:\monorepo\apps\vibe-tutor\package.json",
            r"V:\monorepo\apps\vibe-tutor\README.md"
        ]
    },
    # 5. Websites and PWAs
    "3aa5ec71-58ca-426c-aa68-0d0ad2dfb797": {
        "name": "Websites & PWAs",
        "files": [
            r"V:\monorepo\apps\vibe-shop\package.json",
            r"V:\monorepo\apps\vibe-shop\README.md",
            r"V:\monorepo\apps\vibe-tech-lovable\package.json",
            r"V:\monorepo\apps\vibe-tech-lovable\README.md",
            r"V:\monorepo\apps\shipping-pwa\package.json",
            r"V:\monorepo\apps\shipping-pwa\README.md",
            r"V:\monorepo\apps\vibe-portal\package.json",
            r"V:\monorepo\apps\vibe-portal\README.md",
            r"V:\monorepo\apps\vibe-booking\package.json",
            r"V:\monorepo\apps\vibe-booking\README.md",
            r"V:\monorepo\apps\vibe-dental\package.json",
            r"V:\monorepo\apps\vibe-dental\README.md",
            r"V:\monorepo\apps\vibe-reminder\package.json",
            r"V:\monorepo\apps\vibe-reminder\README.md",
            r"V:\monorepo\apps\vibe-discharge\package.json",
            r"V:\monorepo\apps\vibe-discharge\README.md",
            r"V:\monorepo\apps\cme-track\package.json",
            r"V:\monorepo\apps\cme-track\README.md",
            r"V:\monorepo\apps\prior-auth-pro\package.json",
            r"V:\monorepo\apps\prior-auth-pro\README.md",
            r"V:\monorepo\apps\proposal-review-saas\package.json",
            r"V:\monorepo\apps\proposal-review-saas\README.md",
            r"V:\monorepo\apps\vibe-tech-marketing\package.json",
            r"V:\monorepo\apps\vibe-tech-marketing\README.md"
        ]
    },
    # 6. D Drive Learning System
    "d0854e3e-4bc1-4fb0-a0cf-8b3c46c580f3": {
        "name": "Learning System",
        "files": [
            r"D:\learning-system\COMPLETE_GUIDE.md",
            r"D:\learning-system\CRYPTO_DATABASE_SCHEMA_LEARNINGS_2025-11-04.md",
            r"D:\learning-system\DATABASE_INVENTORY.md",
            r"D:\learning-system\DOCUMENTATION_INDEX.md",
            r"D:\learning-system\D_DRIVE_OVERVIEW.md",
            r"D:\learning-system\README.md",
            r"D:\learning-system\enhanced_agent_guidelines.md"
        ]
    },
    # 7. D Drive Databases
    "965ec94a-5ee2-4b17-af4f-fa259beaed5a": {
        "name": "Databases",
        "files": [
            r"D:\databases\DATABASE_COMPLETE_SCHEMAS.md",
            r"D:\databases\DB_INVENTORY.md",
            r"D:\databases\SCHEMA_STANDARDS.md",
            r"D:\databases\UNIFIED_DATABASE_COMPLETE.md",
            r"D:\databases\DATABASE_BEST_PRACTICES_2025.md",
            r"D:\databases\DATABASE_ANALYSIS_REPORT.md",
            r"D:\databases\README.md"
        ]
    },
    # 8. D Drive Memory
    "86d21409-c4e9-4e31-a714-d7ee758c2aaf": {
        "name": "Memory System",
        "files": [
            r"V:\monorepo\packages\memory\README.md",
            r"V:\monorepo\apps\memory-mcp\README.md",
            r"V:\monorepo\docs\memory-system\ARCHITECTURE.md",
            r"V:\monorepo\docs\memory-system\ROADMAP.md"
        ]
    },
    # 9. Vibe Backend Services
    "971919c0-e828-40cc-9385-fa680f029a2d": {
        "name": "Backend Services",
        "files": [
            r"V:\monorepo\backend\openrouter-proxy\package.json",
            r"V:\monorepo\backend\openrouter-proxy\README.md",
            r"V:\monorepo\backend\ipc-bridge\package.json",
            r"V:\monorepo\backend\ipc-bridge\README.md",
            r"V:\monorepo\backend\dap-proxy\package.json",
            r"V:\monorepo\backend\dap-proxy\README.md",
            r"V:\monorepo\backend\lsp-proxy\package.json",
            r"V:\monorepo\backend\lsp-proxy\README.md",
            r"V:\monorepo\backend\workflow-engine\package.json",
            r"V:\monorepo\backend\workflow-engine\README.md",
            r"V:\monorepo\apps\vibe-booking-backend\package.json",
            r"V:\monorepo\apps\vibe-booking-backend\README.md",
            r"V:\monorepo\apps\symptom-tracker-api\package.json",
            r"V:\monorepo\apps\symptom-tracker-api\README.md",
            r"V:\monorepo\apps\vibe-reflection\package.json",
            r"V:\monorepo\apps\vibe-reflection\README.md"
        ]
    },
    # 10. Vibe MCP Servers
    "e790359d-5efd-4ba4-a5b7-174e1c083830": {
        "name": "MCP Servers",
        "files": [
            r"V:\monorepo\apps\mcp-skills-server\package.json",
            r"V:\monorepo\apps\mcp-skills-server\README.md",
            r"V:\monorepo\apps\mcp-gateway\package.json",
            r"V:\monorepo\apps\mcp-gateway\README.md",
            r"V:\monorepo\apps\mcp-rag-server\package.json",
            r"V:\monorepo\apps\mcp-rag-server\README.md",
            r"V:\monorepo\apps\workspace-mcp-server\package.json",
            r"V:\monorepo\apps\workspace-mcp-server\README.md",
            r"V:\monorepo\apps\learning-pipeline-mcp\package.json",
            r"V:\monorepo\apps\learning-pipeline-mcp\README.md",
            r"V:\monorepo\apps\monorepo-health-mcp\package.json",
            r"V:\monorepo\apps\monorepo-health-mcp\README.md",
            r"V:\monorepo\apps\proactive-recommendations-mcp\package.json",
            r"V:\monorepo\apps\proactive-recommendations-mcp\README.md",
            r"V:\monorepo\apps\skill-feedback-mcp\package.json",
            r"V:\monorepo\apps\skill-feedback-mcp\README.md"
        ]
    }
}

def get_file_hash(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def get_notebook_sources(notebook_id: str):
    cmd = ["nlm", "get", "notebook", notebook_id, "--json"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if res.returncode != 0:
        print(f"Error fetching notebook {notebook_id}: {res.stderr}")
        return []
    try:
        data = json.loads(res.stdout)
        return data.get("sources", [])
    except Exception as e:
        print(f"Failed to parse JSON for {notebook_id}: {e}")
        return []

def delete_source(source_id: str):
    cmd = ["nlm", "source", "delete", source_id, "--confirm"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return res.returncode == 0

def add_file_source(notebook_id: str, filepath: str):
    cmd = ["nlm", "source", "add", notebook_id, "--file", filepath, "--wait"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return res.returncode == 0

def add_text_source(notebook_id: str, title: str, content: str):
    cmd = ["nlm", "source", "add", notebook_id, "--text", content, "--title", title, "--wait"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return res.returncode == 0

def sync_file(notebook_id: str, filepath: str, current_sources, state):
    if not os.path.exists(filepath):
        print(f"  [SKIP] File not found: {filepath}")
        return False
    
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()
    
    # Customize title for generic names in subfolders
    parts = filepath.split(os.sep)
    if filename.lower() in ["package.json", "app.json", "readme.md", "capacitor.config.ts", "tauri.conf.json"]:
        if len(parts) >= 3:
            filename = f"{parts[-2]}/{filename}"
            
    # Check if we have uploaded it before and it hasn't changed
    current_hash = get_file_hash(filepath)
    cached_hash = state.get(notebook_id, {}).get(filepath)
    
    # Verify if source actually exists in the notebook
    matching_source = next((s for s in current_sources if s["title"].lower() == filename.lower()), None)
    
    if cached_hash == current_hash and matching_source:
        print(f"  [OK] Up to date: {filename}")
        return False

    print(f"  [SYNC] Syncing: {filename}...")
    if matching_source:
        print(f"    [DELETE] Deleting old source {matching_source['id']}...")
        delete_source(matching_source["id"])
    
    success = False
    if ext in [".json", ".yaml", ".yml", ".ts", ".tsx"]:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        success = add_text_source(notebook_id, filename, content)
    else:
        success = add_file_source(notebook_id, filepath)
        if not success:
            print(f"    [WARN] File upload failed. Falling back to text upload...")
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            success = add_text_source(notebook_id, filename, content)
        
    if success:
        if notebook_id not in state:
            state[notebook_id] = {}
        state[notebook_id][filepath] = current_hash
        print(f"    [OK] Successfully synced: {filename}")
    else:
        print(f"    [ERROR] Failed to sync: {filename}")
        
    return success

def main():
    print("=== Starting NotebookLM Synchronization ===")
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                state = json.load(f)
        except Exception:
            state = {}
            
    has_changes = False
    for notebook_id, info in MAPS.items():
        name = info["name"]
        print(f"\nNotebook: {name} ({notebook_id})")
        sources = get_notebook_sources(notebook_id)
        for filepath in info["files"]:
            if sync_file(notebook_id, filepath, sources, state):
                has_changes = True
                
    if has_changes or not os.path.exists(STATE_FILE):
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
        print("\nSaved sync state to D:\\")
    else:
        print("\nAll notebooks are fully synchronized!")

if __name__ == "__main__":
    main()
