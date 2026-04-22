"""Wave 2 architecture-fix tests."""
from __future__ import annotations
import ast
import importlib
import sys
from pathlib import Path
from unittest.mock import patch
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]

def test_alembic_env_reads_database_path():
    src = (BACKEND_DIR / "alembic" / "env.py").read_text(encoding="utf-8")
    assert "DATABASE_PATH" in src
    assert "set_main_option" in src

def test_alembic_ini_url_blank():
    src = (BACKEND_DIR / "alembic.ini").read_text(encoding="utf-8")
    for line in src.splitlines():
        s = line.strip()
        if s.startswith("sqlalchemy.url") and not s.startswith("#"):
            assert s.split("=", 1)[1].strip() == ""

def test_paths_prefers_database_path(monkeypatch, tmp_path):
    target = tmp_path / "x.db"
    monkeypatch.setenv("DATABASE_PATH", str(target))
    sys.modules.pop("vibe_justice.utils.paths", None)
    from vibe_justice.utils.paths import get_database_path
    assert str(get_database_path()) == str(target)

def test_paths_dir_prefers_database_path(monkeypatch, tmp_path):
    target = tmp_path / "nested" / "app.db"
    monkeypatch.setenv("DATABASE_PATH", str(target))
    sys.modules.pop("vibe_justice.utils.paths", None)
    from vibe_justice.utils.paths import get_database_directory
    assert str(get_database_directory()) == str(target.parent)

def test_no_learning_system_in_data_root():
    with patch("platform.system", return_value="Windows"):
        with patch.object(Path, "exists", return_value=True):
            sys.modules.pop("vibe_justice.utils.paths", None)
            from vibe_justice.utils.paths import get_platform_data_root
            assert "learning-system" not in str(get_platform_data_root()).lower()

def test_drafting_uses_data_dir():
    src = (BACKEND_DIR / "vibe_justice" / "services" / "drafting_service.py").read_text(encoding="utf-8")
    assert "VibeJusticeData" not in src
    assert "get_data_directory" in src

def test_cases_writes_inside_with_block():
    src = (BACKEND_DIR / "vibe_justice" / "api" / "cases.py").read_text(encoding="utf-8")
    lines = src.splitlines()
    idx = next(i for i, l in enumerate(lines) if "with open(log_file" in l and chr(34)+"a"+chr(34) in l)
    base = len(lines[idx]) - len(lines[idx].lstrip())
    for l in lines[idx+1:idx+13]:
        if l.strip().startswith("f.write"):
            assert len(l) - len(l.lstrip()) > base, l

def test_batch_streaming():
    src = (BACKEND_DIR / "vibe_justice" / "api" / "batch_processing.py").read_text(encoding="utf-8")
    assert "await upload_file.read()" not in src
    assert "await upload_file.read(1024 * 1024)" in src
    assert "status_code=413" in src

def test_ai_no_moonshot_remap():
    src = (BACKEND_DIR / "vibe_justice" / "services" / "ai_service.py").read_text(encoding="utf-8")
    assert "moonshot-v1-32k" not in src

def test_openrouter_fallback_chain():
    src = (BACKEND_DIR / "vibe_justice" / "ai" / "openrouter_client.py").read_text(encoding="utf-8")
    assert "_build_fallback_chain" in src
    assert "deepseek/deepseek-chat-v3" in src
    assert "deepseek/deepseek-r1" in src

def test_deepseek_fallback_chain():
    src = (BACKEND_DIR / "vibe_justice" / "ai" / "deepseek_client.py").read_text(encoding="utf-8")
    assert "_build_fallback_chain" in src
    assert "(404, 429)" in src

def test_retrieval_uses_proxy_embedding():
    src = (BACKEND_DIR / "vibe_justice" / "services" / "retrieval_service.py").read_text(encoding="utf-8")
    assert "def _get_embedding" in src
    assert "/api/v1/embeddings" in src
    assert "text-embedding-3-small" in src
    assert "OPENROUTER_PROXY_URL" in src
    assert "_get_embedding(query)" in src

@pytest.mark.xfail(reason="requires live proxy or respx mock")
def test_retrieval_integration():
    pytest.fail("integration-level; see xfail")

def test_alembic_baseline_is_real():
    src = (BACKEND_DIR / "alembic" / "versions" / "0731d6d83b4a_initial_migration_baseline_setup.py").read_text(encoding="utf-8")
    assert "SQLModel.metadata.create_all" in src
    assert "SQLModel.metadata.drop_all" in src
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name in ("upgrade", "downgrade"):
            real = [s for s in node.body if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
            assert real, node.name
            assert not all(isinstance(s, ast.Pass) for s in real), node.name

def test_rate_limit_module_exists():
    mod = importlib.import_module("vibe_justice.utils.rate_limit")
    assert getattr(mod, "limiter", None) is not None

def test_no_routes_import_limiter_from_main():
    api_dir = BACKEND_DIR / "vibe_justice" / "api"
    offenders = [p.name for p in api_dir.glob("*.py") if "from main import limiter" in p.read_text(encoding="utf-8")]
    assert not offenders, offenders

def test_main_no_e402_on_api_imports():
    src = (BACKEND_DIR / "main.py").read_text(encoding="utf-8")
    idx = src.find("from vibe_justice.api import")
    assert idx != -1
    assert "noqa: E402" not in src[idx:idx+400]

def test_web_search_caps_redirects():
    src = (BACKEND_DIR / "vibe_justice" / "services" / "web_search_service.py").read_text(encoding="utf-8")
    assert "max_redirects=3" in src
