param(
  [string]$DbPath = "D:\\databases\\nova_shared.db",
  [string]$SeedDir = "C:\\dev\\apps\\nova-agent\\prompts",
  [string[]]$PromptNames = @("nova-core-v1", "nova-architect-v1", "nova-engineer-v1")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-OnDDrive([string]$PathValue, [string]$Name) {
  $full = [System.IO.Path]::GetFullPath($PathValue)
  if (-not $full.ToUpperInvariant().StartsWith("D:\\")) {
    throw "$Name must be on D:\\ (got $full)"
  }
}

function Get-PythonExe {
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return @("py", "-3") }
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return @("python") }
  throw "Python not found (expected 'py' or 'python' on PATH)."
}

Assert-OnDDrive -PathValue $DbPath -Name "DbPath"

if (-not (Test-Path $SeedDir)) {
  throw "SeedDir not found: $SeedDir"
}

foreach ($name in $PromptNames) {
  $p = Join-Path $SeedDir "$name.md"
  if (-not (Test-Path $p)) {
    throw "Missing prompt seed file: $p"
  }
}

$dbDir = Split-Path -Parent $DbPath
if (-not (Test-Path $dbDir)) {
  New-Item -ItemType Directory -Force -Path $dbDir | Out-Null
}

$pythonCmd = Get-PythonExe
$pythonExe = $pythonCmd[0]
$pythonArgs = @()
if ($pythonCmd.Length -gt 1) {
  $pythonArgs = $pythonCmd[1..($pythonCmd.Length - 1)]
}
$seedDirEsc = $SeedDir.Replace("\\", "\\\\")
$dbPathEsc = $DbPath.Replace("\\", "\\\\")

$promptNamesJson = ($PromptNames | ConvertTo-Json -Compress)

$pyCode = @"
import json, os, sqlite3, uuid, datetime, sys
db_path = r"$dbPathEsc"
seed_dir = r"$seedDirEsc"
prompt_names = json.loads(r'''$promptNamesJson''')

os.makedirs(os.path.dirname(db_path), exist_ok=True)
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute(\"\"\"
CREATE TABLE IF NOT EXISTS prompt_entities (
  prompt_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  evolution_stage TEXT NOT NULL,
  current_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_updated TEXT NOT NULL
);
\"\"\")
cur.execute(\"\"\"
CREATE TABLE IF NOT EXISTS prompt_versions (
  version_id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  content TEXT NOT NULL,
  dna TEXT NOT NULL,
  metrics TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  notes TEXT
);
\"\"\")

def now():
  return datetime.datetime.utcnow().isoformat() + "Z"

for name in prompt_names:
  seed_path = os.path.join(seed_dir, f"{name}.md")
  with open(seed_path, "r", encoding="utf-8") as f:
    content = f.read().strip()
  if not content:
    raise RuntimeError(f"Seed file is empty: {seed_path}")

  cur.execute("SELECT prompt_id FROM prompt_entities WHERE name = ?", (name,))
  row = cur.fetchone()
  version_id = str(uuid.uuid4())
  ts = now()

  if row:
    prompt_id = row[0]
  else:
    prompt_id = str(uuid.uuid4())
    cur.execute(
      "INSERT INTO prompt_entities (prompt_id, name, description, category, evolution_stage, current_version, created_at, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      (prompt_id, name, "Seeded by bootstrap_db.ps1", "agent_system_prompts", "seed", version_id, ts, ts),
    )

  cur.execute(
    "INSERT INTO prompt_versions (version_id, prompt_id, content, dna, metrics, created_at, created_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    (version_id, prompt_id, content, "{}", "{}", ts, "bootstrap_db.ps1", seed_path),
  )

  cur.execute("UPDATE prompt_entities SET current_version = ?, last_updated = ? WHERE prompt_id = ?", (version_id, ts, prompt_id))
  print(f"OK: ensured prompt {name} (version {version_id[:8]})")

conn.commit()
conn.close()
"@

& $pythonExe @pythonArgs -c $pyCode

Write-Host "SUCCESS: Prompt bootstrap completed for $DbPath" -ForegroundColor Green
