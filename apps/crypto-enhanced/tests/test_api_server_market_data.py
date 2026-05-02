"""Tests for dashboard market-data safety helpers."""

from __future__ import annotations

import asyncio

from api_server import (
    _extract_last_price,
    _portfolio_value,
    _valuation_status,
    get_market_data,
)
import api_server


class FakeKrakenClient:
    def __init__(self):
        self.requested_pair = None

    async def get_ticker(self, pair: str):
        self.requested_pair = pair
        return {"XXLMZUSD": {"c": ["0.123456", "1"]}}


def test_extract_last_price_from_kraken_ticker():
    ticker = {"XXLMZUSD": {"c": ["0.123456", "1"]}}

    assert _extract_last_price(ticker) == 0.123456


def test_portfolio_value_is_unknown_when_xlm_price_is_missing():
    assert _portfolio_value(100.0, 10.0, None) is None
    assert _valuation_status(10.0, None) == "price_unavailable"


def test_portfolio_value_allows_missing_price_when_xlm_balance_is_zero():
    assert _portfolio_value(100.0, 0.0, None) == 100.0
    assert _valuation_status(0.0, None) == "price_not_required"


def test_market_data_endpoint_uses_get_ticker(monkeypatch):
    fake_client = FakeKrakenClient()
    monkeypatch.setattr(api_server, "kraken_client", fake_client)

    response = asyncio.run(get_market_data("XLM/USD"))

    assert fake_client.requested_pair == "XLM/USD"
    assert response["status"] == "live"
    assert response["data"]["XXLMZUSD"]["c"][0] == "0.123456"
