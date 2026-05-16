"""Focused unit tests for API request and response validation helpers."""

import pytest

from api_validator import (
    EdgeCaseValidator,
    KrakenAPIValidator,
    RateLimitValidator,
    quick_validate_order,
    quick_validate_ws_subscribe,
)


def test_websocket_url_validation_distinguishes_public_and_private_endpoints():
    """Kraken WebSocket V2 URL checks should reject endpoint mixups."""
    public_result = KrakenAPIValidator.validate_websocket_url(
        KrakenAPIValidator.WS_V2_PUBLIC
    )
    private_result = KrakenAPIValidator.validate_websocket_url(
        KrakenAPIValidator.WS_V2_PRIVATE,
        is_private=True,
    )
    wrong_result = KrakenAPIValidator.validate_websocket_url(
        KrakenAPIValidator.WS_V2_PRIVATE
    )

    assert public_result.is_valid
    assert private_result.is_valid
    assert not wrong_result.is_valid
    assert wrong_result.details == {
        "expected": KrakenAPIValidator.WS_V2_PUBLIC,
        "actual": KrakenAPIValidator.WS_V2_PRIVATE,
    }


def test_subscription_message_validation_uses_websocket_v2_shape():
    """Subscription validation should reject V1-style and malformed messages."""
    valid_public = {
        "method": "subscribe",
        "params": {"channel": "ticker", "symbol": ["BTC/USD"]},
    }
    valid_private = {
        "method": "subscribe",
        "params": {"channel": "executions"},
    }

    assert KrakenAPIValidator.validate_subscription_message(valid_public).is_valid
    assert KrakenAPIValidator.validate_subscription_message(
        valid_private,
        is_private=True,
    ).is_valid

    v1_style = KrakenAPIValidator.validate_subscription_message(
        {"event": "subscribe", "pair": ["BTC/USD"]}
    )
    missing_symbol = KrakenAPIValidator.validate_subscription_message(
        {"method": "subscribe", "params": {"channel": "ticker"}}
    )
    scalar_symbol = KrakenAPIValidator.validate_subscription_message(
        {
            "method": "subscribe",
            "params": {"channel": "ticker", "symbol": "BTC/USD"},
        }
    )
    wrong_channel = KrakenAPIValidator.validate_subscription_message(
        {"method": "subscribe", "params": {"channel": "executions"}},
    )

    assert not v1_style.is_valid
    assert "method" in v1_style.message
    assert not missing_symbol.is_valid
    assert "symbol" in missing_symbol.message
    assert not scalar_symbol.is_valid
    assert "array" in scalar_symbol.message
    assert not wrong_channel.is_valid
    assert wrong_channel.details["channel"] == "executions"


def test_trading_pair_validation_requires_slash_separator():
    """Trading pairs should use Kraken WebSocket V2 slash-separated symbols."""
    assert KrakenAPIValidator.validate_trading_pair("BTC/USD").is_valid

    invalid = KrakenAPIValidator.validate_trading_pair("BTCUSD")

    assert not invalid.is_valid
    assert invalid.details == {"pair": "BTCUSD"}


@pytest.mark.parametrize(
    ("params", "message_fragment"),
    [
        ({}, "symbol"),
        (
            {
                "symbol": "XLM/USD",
                "side": "hold",
                "order_type": "limit",
                "order_qty": 10,
            },
            "side",
        ),
        (
            {
                "symbol": "XLM/USD",
                "side": "buy",
                "order_type": "iceberg",
                "order_qty": 10,
            },
            "order_type",
        ),
        (
            {
                "symbol": "XLM/USD",
                "side": "buy",
                "order_type": "limit",
                "order_qty": 0,
            },
            "positive",
        ),
        (
            {
                "symbol": "XLM/USD",
                "side": "buy",
                "order_type": "limit",
                "order_qty": "not-a-number",
            },
            "number",
        ),
    ],
)
def test_order_param_validation_rejects_missing_and_invalid_fields(
    params,
    message_fragment,
):
    """Order validation should catch bad payloads before an API send."""
    result = KrakenAPIValidator.validate_order_params(params)

    assert not result.is_valid
    assert message_fragment in result.message


def test_order_param_validation_accepts_valid_limit_order():
    """A complete Kraken V2 order payload should pass validation."""
    result = KrakenAPIValidator.validate_order_params(
        {
            "symbol": "XLM/USD",
            "side": "buy",
            "order_type": "limit",
            "order_qty": "25.5",
        }
    )

    assert result.is_valid


def test_rate_limit_validator_tracks_requests_within_window(monkeypatch):
    """Rate limiting should be deterministic around the configured window."""
    now = 1000.0
    monkeypatch.setattr("api_validator.time.time", lambda: now)

    limiter = RateLimitValidator()
    public_limit = limiter.limits["public"]["requests"]

    for _ in range(public_limit):
        assert limiter.can_make_request("public").is_valid
        limiter.record_request("public")

    limited = limiter.can_make_request("public")

    assert not limited.is_valid
    assert limited.details["current_count"] == public_limit
    assert limited.details["wait_time_seconds"] == pytest.approx(1.0)

    now = 1001.1
    assert limiter.can_make_request("public").is_valid


def test_rate_limit_validator_rejects_unknown_category():
    """Unknown rate-limit buckets should fail closed."""
    result = RateLimitValidator().can_make_request("unknown")

    assert not result.is_valid
    assert result.details == {"category": "unknown"}


@pytest.mark.parametrize("response", [None, [], {}])
def test_api_response_validation_rejects_empty_or_non_mapping_responses(response):
    """Response validation should reject shapes that cannot be read safely."""
    result = EdgeCaseValidator.validate_api_response(response)

    assert not result.is_valid


def test_api_response_validation_accepts_non_empty_mapping():
    """Non-empty response dictionaries are safe to pass onward."""
    result = EdgeCaseValidator.validate_api_response({"result": {"status": "ok"}})

    assert result.is_valid


def test_websocket_message_order_validation_checks_sequence_and_length():
    """Message order validation should catch out-of-order WebSocket events."""
    messages = [{"method": "subscribe"}, {"channel": "ticker"}]

    assert EdgeCaseValidator.validate_websocket_message_order(
        messages,
        ["subscribe", "ticker"],
    ).is_valid

    wrong_order = EdgeCaseValidator.validate_websocket_message_order(
        messages,
        ["ticker", "subscribe"],
    )
    wrong_length = EdgeCaseValidator.validate_websocket_message_order(
        messages,
        ["subscribe"],
    )

    assert not wrong_order.is_valid
    assert wrong_order.details["index"] == 0
    assert not wrong_length.is_valid
    assert wrong_length.details == {"expected": 1, "actual": 2}


def test_quick_validation_helpers_return_boolean_results():
    """Convenience validators should expose simple true/false answers."""
    assert quick_validate_ws_subscribe("ticker", "BTC/USD")
    assert not quick_validate_ws_subscribe("executions", "BTC/USD")
    assert quick_validate_order("XLM/USD", "buy", "limit", 10)
    assert not quick_validate_order("XLM/USD", "buy", "limit", 0)
