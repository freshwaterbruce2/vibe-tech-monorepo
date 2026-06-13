"""
Shared fixtures and import-path setup for the integration test suite.

The crypto-enhanced project keeps its production modules under ``src/`` but
imports them with bare names (``from market_maker import ...``). The standard
``run_tests.py`` adds ``src/`` to ``sys.path`` before invoking pytest. When
pytest is invoked directly (CI, IDE, ``pnpm nx test``), the new integration
suite still needs to resolve those bare-name imports, so this conftest patches
``sys.path`` defensively.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import pytest

_SRC = (Path(__file__).resolve().parents[2] / "src").resolve()
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))


# ---------------------------------------------------------------------------
# Engine / config / websocket fakes for GridMarketMaker integration tests
# ---------------------------------------------------------------------------


class FakeWebsocket:
    """Records cancel_all + order calls so tests can assert on them."""

    def __init__(self) -> None:
        self.cancel_all_calls = 0
        self.fail_cancel = False

    async def cancel_all_orders(self) -> None:
        self.cancel_all_calls += 1
        if self.fail_cancel:
            raise RuntimeError("simulated cancel_all failure")


class FakeEngine:
    """
    Minimal stand-in for ``TradingEngine`` exposing only the surface
    GridMarketMaker actually touches.
    """

    def __init__(self, *, mid: float = 0.42, depth: float = 5000.0) -> None:
        self.trading_halted = False
        self.positions: Dict[str, Dict[str, Any]] = {}
        self.websocket = FakeWebsocket()
        self.market_data: Dict[str, Any] = {}
        self.placed_orders: List[Dict[str, Any]] = []
        self._req_seq = 0
        self.fail_place_at: Optional[int] = None
        self.set_book(mid=mid, depth=depth)

    def set_book(self, *, mid: float, depth: float, imbalance: float = 1.0) -> None:
        """Seed a synthetic L2 book centred on ``mid`` with the requested depth."""
        spread = max(mid * 0.0002, 1e-5)
        bid = round(mid - spread / 2, 6)
        ask = round(mid + spread / 2, 6)
        self.market_data["XLM/USD_book"] = {
            "bids": [[str(bid), str(depth * imbalance)]],
            "asks": [[str(ask), str(depth / imbalance)]],
        }
        self.market_data["XLM/USD_ticker"] = {"last": str(mid)}

    async def place_order(
        self,
        *,
        pair: str,
        side: Any,
        order_type: Any,
        volume: Any,
        price: Any,
    ) -> Dict[str, Any]:
        self._req_seq += 1
        if self.fail_place_at is not None and self._req_seq == self.fail_place_at:
            raise RuntimeError("simulated place_order failure")
        order = {
            "req_id": self._req_seq,
            "pair": pair,
            "side": getattr(side, "value", str(side)),
            "type": getattr(order_type, "value", str(order_type)),
            "volume": float(volume),
            "price": float(price),
        }
        self.placed_orders.append(order)
        return order


class FakeConfig:
    """Mimics the attributes GridMarketMaker reads from src/config.Config."""

    def __init__(self) -> None:
        self.xlm_min_order_size = 20.0


@pytest.fixture
def fake_engine() -> FakeEngine:
    return FakeEngine()


@pytest.fixture
def fake_config() -> FakeConfig:
    return FakeConfig()


@pytest.fixture
def tmp_rl_config(tmp_path: Path) -> Path:
    """Returns a path under tmp for RL JSON exports without creating the file."""
    return tmp_path / "rl_params.json"
