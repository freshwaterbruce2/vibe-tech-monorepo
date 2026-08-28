"""Tests for dashboard market-data safety helpers."""

from __future__ import annotations

import asyncio

from api_server import (
    _extract_last_price,
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


def test_market_data_endpoint_uses_get_ticker(monkeypatch):
    fake_client = FakeKrakenClient()
    monkeypatch.setattr(api_server, "kraken_client", fake_client)

    response = asyncio.run(get_market_data("XLM/USD"))

    assert fake_client.requested_pair == "XLM/USD"
    assert response["status"] == "live"
    assert response["data"]["XXLMZUSD"]["c"][0] == "0.123456"
