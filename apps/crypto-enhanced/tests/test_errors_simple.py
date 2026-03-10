"""
Tests for simplified error classes

Tests the actual error hierarchy: TradingError -> APIError -> KrakenAPIError
with severity classification and retryability checking.
"""

import pytest
from errors_simple import (
    TradingError,
    APIError,
    KrakenAPIError,
    WebSocketError,
    OrderError,
    ErrorSeverity,
    is_retryable,
    log_error,
)


def test_error_hierarchy():
    """Test error class inheritance chain"""
    assert issubclass(APIError, TradingError)
    assert issubclass(KrakenAPIError, APIError)
    assert issubclass(WebSocketError, TradingError)
    assert issubclass(OrderError, TradingError)


def test_kraken_api_error_basic():
    """Test basic KrakenAPIError functionality"""
    error = KrakenAPIError("Test error message")
    assert error.error_message == "Test error message"
    assert error.endpoint is None
    assert error.status_code is None
    assert isinstance(error, Exception)


def test_kraken_api_error_with_metadata():
    """Test KrakenAPIError with full metadata"""
    error = KrakenAPIError(
        "Order failed",
        endpoint="/api/v1/order",
        status_code=400,
        request_data={"pair": "XLM/USD"}
    )
    assert error.error_message == "Order failed"
    assert error.endpoint == "/api/v1/order"
    assert error.status_code == 400
    assert error.request_data == {"pair": "XLM/USD"}


def test_severity_classification_critical():
    """Test CRITICAL severity classification"""
    auth_error = KrakenAPIError("Authentication failed")
    assert auth_error.severity == ErrorSeverity.CRITICAL

    funds_error = KrakenAPIError("Insufficient funds")
    assert funds_error.severity == ErrorSeverity.CRITICAL

    key_error = KrakenAPIError("Invalid API key")
    assert key_error.severity == ErrorSeverity.CRITICAL


def test_severity_classification_warning():
    """Test WARNING severity classification"""
    rate_error = KrakenAPIError("Rate limit exceeded")
    assert rate_error.severity == ErrorSeverity.WARNING

    timeout_error = KrakenAPIError("Request timeout")
    assert timeout_error.severity == ErrorSeverity.WARNING


def test_severity_classification_error():
    """Test ERROR severity classification (default)"""
    generic_error = KrakenAPIError("Unknown error occurred")
    assert generic_error.severity == ErrorSeverity.ERROR


def test_is_rate_limit_error():
    """Test rate limit error detection"""
    rate_error = KrakenAPIError("Rate limit exceeded")
    assert rate_error.is_rate_limit_error()

    normal_error = KrakenAPIError("Order failed")
    assert not normal_error.is_rate_limit_error()


def test_is_nonce_error():
    """Test nonce error detection"""
    nonce_error = KrakenAPIError("Nonce collision detected")
    assert nonce_error.is_nonce_error()

    normal_error = KrakenAPIError("Order failed")
    assert not normal_error.is_nonce_error()


def test_is_permission_error():
    """Test permission error detection"""
    perm_error = KrakenAPIError("Permission denied")
    assert perm_error.is_permission_error()

    unauth_error = KrakenAPIError("Unauthorized access")
    assert unauth_error.is_permission_error()

    normal_error = KrakenAPIError("Order failed")
    assert not normal_error.is_permission_error()


def test_websocket_error():
    """Test WebSocketError with message and context"""
    error = WebSocketError("Connection lost", channel="ticker", reconnect=True)
    assert error.message == "Connection lost"
    assert error.context["channel"] == "ticker"
    assert error.context["reconnect"] is True


def test_order_error():
    """Test OrderError basic functionality"""
    error = OrderError("Order size below minimum")
    assert "Order" in str(error)
    assert isinstance(error, TradingError)


def test_is_retryable_false():
    """Test is_retryable returns False for critical errors"""
    auth_error = Exception("Authentication failed")
    assert not is_retryable(auth_error)

    funds_error = Exception("Insufficient funds")
    assert not is_retryable(funds_error)

    invalid_error = Exception("Invalid pair")
    assert not is_retryable(invalid_error)


def test_is_retryable_true():
    """Test is_retryable returns True for temporary errors"""
    timeout_error = Exception("Connection timeout")
    assert is_retryable(timeout_error)

    rate_error = Exception("Rate limit exceeded")
    assert is_retryable(rate_error)

    network_error = Exception("Network error")
    assert is_retryable(network_error)


def test_is_retryable_default_false():
    """Test is_retryable defaults to False for unknown errors"""
    unknown_error = Exception("Something went wrong")
    assert not is_retryable(unknown_error)


def test_error_raising_and_catching():
    """Test that errors can be raised and caught properly"""
    with pytest.raises(KrakenAPIError) as exc_info:
        raise KrakenAPIError("Not enough balance")

    assert "balance" in str(exc_info.value).lower()


def test_error_hierarchy_catching():
    """Test catching specific error via parent class"""
    try:
        raise KrakenAPIError("Nonce issue")
    except APIError as e:
        assert isinstance(e, KrakenAPIError)
        assert "Nonce" in str(e)
    else:
        pytest.fail("Expected APIError to be raised")


def test_private_endpoint_data_sanitization():
    """Test that private endpoint request data is sanitized"""
    error = KrakenAPIError(
        "Order failed",
        endpoint="/api/private/order",
        request_data={"api_key": "secret"}
    )
    # Should sanitize private endpoint data
    assert error.request_data is None


def test_public_endpoint_data_preserved():
    """Test that public endpoint request data is preserved"""
    error = KrakenAPIError(
        "Request failed",
        endpoint="/api/public/ticker",
        request_data={"pair": "XLM/USD"}
    )
    # Should preserve public endpoint data
    assert error.request_data == {"pair": "XLM/USD"}
