"""
Strategy validation sandbox.

Two-stage guard for user-supplied / RL-emitted strategy code before it is ever
imported into the live trading loop:

  Stage 1  (always on)  -  ast.parse() syntax validation
                           rejects forbidden top-level constructs:
                             * import of os / subprocess / socket / ctypes
                             * use of eval / exec / __import__ / compile
                             * file-system writes outside an approved sandbox
                             * network calls

  Stage 2  (optional)   -  ``mypy --strict`` type-safety check
                           skipped when mypy is not installed; the test suite
                           verifies both branches.

The sandbox also executes a *single tick* against an in-memory engine stub to
prove the strategy can be instantiated and ``evaluate()`` returns without
raising. Hard timeout via asyncio.wait_for keeps a runaway strategy from
holding the test process.

This module is imported by tests/integration/test_strategy_sandbox.py.
"""

from __future__ import annotations

import ast
import asyncio
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, List, Optional, Sequence


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass
class ValidationResult:
    ok: bool
    syntax_ok: bool = False
    forbidden: List[str] = field(default_factory=list)
    mypy_ok: Optional[bool] = None        # None when mypy unavailable
    mypy_output: str = ""
    tick_ok: Optional[bool] = None
    tick_error: str = ""

    def reason(self) -> str:
        if not self.syntax_ok:
            return "syntax error or forbidden construct"
        if self.mypy_ok is False:
            return "mypy --strict reported errors"
        if self.tick_ok is False:
            return f"single-tick execution raised: {self.tick_error}"
        return "ok"


# ---------------------------------------------------------------------------
# Forbidden-construct AST visitor
# ---------------------------------------------------------------------------


_FORBIDDEN_MODULES = frozenset(
    {
        "os",
        "subprocess",
        "socket",
        "ctypes",
        "shutil",
        "pathlib",          # disk writes
        "requests",
        "urllib",
        "http",
        "httpx",
        "aiohttp",
        "smtplib",
        "ftplib",
    }
)
_FORBIDDEN_CALLS = frozenset({"eval", "exec", "compile", "__import__", "open"})


class _ForbiddenVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        self.findings: List[str] = []

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root = alias.name.split(".", 1)[0]
            if root in _FORBIDDEN_MODULES:
                self.findings.append(f"import {alias.name} forbidden")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        root = (node.module or "").split(".", 1)[0]
        if root in _FORBIDDEN_MODULES:
            self.findings.append(f"from {node.module} import ... forbidden")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        func = node.func
        name = ""
        if isinstance(func, ast.Name):
            name = func.id
        elif isinstance(func, ast.Attribute):
            name = func.attr
        if name in _FORBIDDEN_CALLS:
            self.findings.append(f"call to {name}() forbidden")
        self.generic_visit(node)


def _syntax_and_forbidden_scan(source: str) -> tuple[bool, List[str]]:
    try:
        tree = ast.parse(source, mode="exec")
    except SyntaxError as exc:
        return False, [f"SyntaxError: {exc.msg} (line {exc.lineno})"]
    visitor = _ForbiddenVisitor()
    visitor.visit(tree)
    return (len(visitor.findings) == 0), visitor.findings


# ---------------------------------------------------------------------------
# mypy --strict guard
# ---------------------------------------------------------------------------


def _has_mypy() -> bool:
    return shutil.which("mypy") is not None


def _run_mypy_strict(source: str, tmpdir: Path) -> tuple[bool, str]:
    """
    Returns (passed, stdout+stderr). When mypy is missing, the caller should
    treat result as ``None`` rather than relying on this function.
    """
    f = tmpdir / "candidate_strategy.py"
    f.write_text(source, encoding="utf-8")
    try:
        proc = subprocess.run(
            ["mypy", "--strict", "--no-error-summary", "--show-error-codes", str(f)],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except FileNotFoundError:
        return False, "mypy executable missing"
    except subprocess.TimeoutExpired:
        return False, "mypy timed out after 20s"
    output = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode == 0, output


# ---------------------------------------------------------------------------
# Single-tick sandbox runner
# ---------------------------------------------------------------------------


async def _run_single_tick(
    source: str,
    *,
    class_name: str,
    engine: Any,
    config: Any,
    timeout: float = 2.0,
) -> tuple[bool, str]:
    """
    Compile ``source`` in an isolated globals dict, instantiate the strategy
    class, and run a single ``evaluate()`` tick with a hard timeout.
    """
    module_globals: dict[str, Any] = {"__name__": "candidate_strategy"}
    try:
        # NB: exec() here is INSIDE the sandbox, called only after the AST scan
        # has rejected user-controlled ``exec``/``eval``/``open``/etc.
        exec(compile(source, "<candidate>", "exec"), module_globals)   # noqa: S102
    except Exception as exc:   # noqa: BLE001 - we explicitly want every error
        return False, f"import-time error: {exc!r}"

    cls = module_globals.get(class_name)
    if cls is None:
        return False, f"class {class_name!r} not found in candidate source"

    try:
        instance = cls(engine, config, class_name)
    except Exception as exc:   # noqa: BLE001
        return False, f"constructor raised: {exc!r}"

    try:
        await asyncio.wait_for(instance.evaluate(), timeout=timeout)
    except asyncio.TimeoutError:
        return False, f"evaluate() exceeded {timeout}s sandbox timeout"
    except Exception as exc:   # noqa: BLE001
        return False, f"evaluate() raised: {exc!r}"
    return True, ""


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def validate_strategy_source(
    source: str,
    *,
    require_mypy: bool = False,
) -> ValidationResult:
    """
    Static pipeline: AST scan -> (mypy --strict).

    The single-tick stage is provided by ``validate_strategy_with_tick`` (async)
    so callers always drive it on their own event loop — avoids nested loops.
    """
    syntax_ok, findings = _syntax_and_forbidden_scan(source)
    result = ValidationResult(ok=False, syntax_ok=syntax_ok, forbidden=findings)
    if not syntax_ok:
        return result

    if _has_mypy():
        with tempfile.TemporaryDirectory() as td:
            ok, output = _run_mypy_strict(source, Path(td))
        result.mypy_ok = ok
        result.mypy_output = output
        if not ok:
            return result
    elif require_mypy:
        result.mypy_ok = False
        result.mypy_output = "mypy required but not installed on PATH"
        return result
    # else: mypy_ok stays None -> skipped silently

    result.ok = syntax_ok and (result.mypy_ok is not False)
    return result


async def validate_strategy_with_tick(
    source: str,
    *,
    class_name: str,
    engine: Any,
    config: Any,
    require_mypy: bool = False,
) -> ValidationResult:
    """Async wrapper that runs every stage including the single-tick sandbox."""
    result = validate_strategy_source(source, require_mypy=require_mypy)
    if not result.syntax_ok:
        return result
    if result.mypy_ok is False:
        return result

    ok, err = await _run_single_tick(
        source, class_name=class_name, engine=engine, config=config
    )
    result.tick_ok = ok
    result.tick_error = err
    result.ok = result.syntax_ok and (result.mypy_ok is not False) and ok
    return result


__all__: Sequence[str] = (
    "ValidationResult",
    "validate_strategy_source",
    "validate_strategy_with_tick",
)
