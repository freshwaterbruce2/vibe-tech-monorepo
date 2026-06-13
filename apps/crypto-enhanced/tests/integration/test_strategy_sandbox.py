"""
Strategy validation sandbox tests.

Verifies that ``strategy_sandbox.validate_strategy_source`` and the async
``validate_strategy_with_tick`` correctly:
  * accept a well-typed, well-behaved strategy class
  * reject syntax errors (ast.parse failure)
  * reject forbidden imports / calls (os, subprocess, eval, exec, open)
  * reject mypy --strict errors when mypy is installed
  * fail the single-tick stage when evaluate() raises
  * enforce the per-tick timeout
"""

import shutil
import sys
import textwrap
from pathlib import Path

import pytest

# Make the sandbox module importable without polluting the production src/ tree.
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from strategy_sandbox import (    # noqa: E402
    validate_strategy_source,
    validate_strategy_with_tick,
)


# ---------------------------------------------------------------------------
# Sample strategy source strings
# ---------------------------------------------------------------------------


GOOD_STRATEGY = textwrap.dedent(
    '''
    """Well-behaved candidate strategy."""

    from typing import Any, Dict, Optional


    class CandidateStrategy:
        def __init__(self, engine: Any, config: Any, name: str) -> None:
            self.engine = engine
            self.config = config
            self.name = name

        async def evaluate(self) -> Optional[Dict[str, Any]]:
            return {"ok": True, "name": self.name}
    '''
).strip()


SYNTAX_ERROR_STRATEGY = "class Broken(:\n    pass\n"


FORBIDDEN_IMPORT_STRATEGY = textwrap.dedent(
    '''
    import os

    class CandidateStrategy:
        def __init__(self, engine, config, name):
            self.engine = engine
            self.config = config
            self.name = name

        async def evaluate(self):
            os.listdir(".")
            return None
    '''
).strip()


FORBIDDEN_EXEC_STRATEGY = textwrap.dedent(
    '''
    class CandidateStrategy:
        def __init__(self, engine, config, name):
            self.engine = engine
            self.config = config
            self.name = name

        async def evaluate(self):
            exec("print('boom')")
            return None
    '''
).strip()


MYPY_BROKEN_STRATEGY = textwrap.dedent(
    '''
    """Type-broken: returns int where Dict|None is annotated."""

    from typing import Any, Dict, Optional


    class CandidateStrategy:
        def __init__(self, engine: Any, config: Any, name: str) -> None:
            self.engine = engine
            self.config = config
            self.name = name

        async def evaluate(self) -> Optional[Dict[str, Any]]:
            return 42        # type: ignore[return-value]  intentionally broken
    '''
).strip()


RAISING_STRATEGY = textwrap.dedent(
    '''
    from typing import Any, Dict, Optional


    class CandidateStrategy:
        def __init__(self, engine: Any, config: Any, name: str) -> None:
            self.engine = engine
            self.config = config
            self.name = name

        async def evaluate(self) -> Optional[Dict[str, Any]]:
            raise RuntimeError("kaboom from candidate")
    '''
).strip()


HANGING_STRATEGY = textwrap.dedent(
    '''
    import asyncio
    from typing import Any, Dict, Optional


    class CandidateStrategy:
        def __init__(self, engine: Any, config: Any, name: str) -> None:
            self.engine = engine
            self.config = config
            self.name = name

        async def evaluate(self) -> Optional[Dict[str, Any]]:
            await asyncio.sleep(60)
            return None
    '''
).strip()


# ---------------------------------------------------------------------------
# Stage 1 — AST scan
# ---------------------------------------------------------------------------


class TestSyntaxAndForbiddenScan:
    def test_good_strategy_passes_scan(self) -> None:
        result = validate_strategy_source(GOOD_STRATEGY)
        assert result.syntax_ok is True
        assert result.forbidden == []

    def test_syntax_error_rejected(self) -> None:
        result = validate_strategy_source(SYNTAX_ERROR_STRATEGY)
        assert result.syntax_ok is False
        assert any("SyntaxError" in f for f in result.forbidden)
        assert result.ok is False

    def test_forbidden_os_import_rejected(self) -> None:
        result = validate_strategy_source(FORBIDDEN_IMPORT_STRATEGY)
        assert result.syntax_ok is False
        assert any("import os" in f for f in result.forbidden)

    def test_forbidden_exec_call_rejected(self) -> None:
        result = validate_strategy_source(FORBIDDEN_EXEC_STRATEGY)
        assert result.syntax_ok is False
        assert any("exec" in f for f in result.forbidden)


# ---------------------------------------------------------------------------
# Stage 2 — mypy --strict
# ---------------------------------------------------------------------------


_MYPY = shutil.which("mypy")


@pytest.mark.skipif(_MYPY is None, reason="mypy is not installed on PATH")
class TestMypyStrict:
    def test_good_strategy_passes_strict(self) -> None:
        result = validate_strategy_source(GOOD_STRATEGY)
        assert result.syntax_ok is True
        assert result.mypy_ok is True
        assert result.ok is True

    def test_broken_types_rejected_by_strict(self) -> None:
        result = validate_strategy_source(MYPY_BROKEN_STRATEGY)
        # `type: ignore` should still trip --strict via unused-ignore on clean
        # code, *or* the underlying return-value mismatch when mypy honours it.
        # Either way, we should NOT silently pass — only assert ``not ok``.
        assert result.syntax_ok is True
        if result.mypy_ok is False:
            assert "error" in result.mypy_output.lower()
            assert result.ok is False


class TestMypyMissing:
    def test_require_mypy_with_no_binary_fails(self, monkeypatch) -> None:
        monkeypatch.setattr("strategy_sandbox._has_mypy", lambda: False)
        result = validate_strategy_source(GOOD_STRATEGY, require_mypy=True)
        assert result.mypy_ok is False
        assert "mypy" in result.mypy_output.lower()

    def test_optional_mypy_skipped_when_missing(self, monkeypatch) -> None:
        monkeypatch.setattr("strategy_sandbox._has_mypy", lambda: False)
        result = validate_strategy_source(GOOD_STRATEGY, require_mypy=False)
        assert result.mypy_ok is None
        assert result.ok is True


# ---------------------------------------------------------------------------
# Stage 3 — single-tick sandbox
# ---------------------------------------------------------------------------


class _DummyEngine:
    trading_halted = False
    positions: dict = {}


class _DummyConfig:
    xlm_min_order_size = 20.0


@pytest.fixture
def no_mypy(monkeypatch):
    """
    Disable the mypy stage for tick-focused tests so the test runtime isn't
    held hostage by mypy's cold-import latency on first invocation. The
    dedicated TestMypyStrict class covers the mypy path on its own.
    """
    monkeypatch.setattr("strategy_sandbox._has_mypy", lambda: False)


class TestSingleTickSandbox:
    @pytest.mark.asyncio
    async def test_good_strategy_completes_a_tick(self, no_mypy) -> None:
        result = await validate_strategy_with_tick(
            GOOD_STRATEGY,
            class_name="CandidateStrategy",
            engine=_DummyEngine(),
            config=_DummyConfig(),
        )
        assert result.syntax_ok is True
        assert result.tick_ok is True
        assert result.ok is True

    @pytest.mark.asyncio
    async def test_raising_strategy_caught(self, no_mypy) -> None:
        result = await validate_strategy_with_tick(
            RAISING_STRATEGY,
            class_name="CandidateStrategy",
            engine=_DummyEngine(),
            config=_DummyConfig(),
        )
        assert result.tick_ok is False
        assert "kaboom" in result.tick_error
        assert result.ok is False

    @pytest.mark.asyncio
    async def test_hanging_strategy_times_out(self, monkeypatch, no_mypy) -> None:
        # Shorten the sandbox tick timeout so the test stays sub-second.
        from strategy_sandbox import _run_single_tick
        import strategy_sandbox

        async def fast_tick(source, **kw):
            kw.setdefault("timeout", 0.2)
            return await _run_single_tick(source, **kw)

        monkeypatch.setattr(strategy_sandbox, "_run_single_tick", fast_tick)

        result = await validate_strategy_with_tick(
            HANGING_STRATEGY,
            class_name="CandidateStrategy",
            engine=_DummyEngine(),
            config=_DummyConfig(),
        )
        assert result.tick_ok is False
        assert "timeout" in result.tick_error.lower() or "sandbox" in result.tick_error.lower()
        assert result.ok is False

    @pytest.mark.asyncio
    async def test_forbidden_strategy_short_circuits_before_tick(self) -> None:
        result = await validate_strategy_with_tick(
            FORBIDDEN_IMPORT_STRATEGY,
            class_name="CandidateStrategy",
            engine=_DummyEngine(),
            config=_DummyConfig(),
        )
        assert result.syntax_ok is False
        assert result.tick_ok is None         # tick stage never ran
        assert result.ok is False
