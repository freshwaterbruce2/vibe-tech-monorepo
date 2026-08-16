
def test_root_requires_auth(client, monkeypatch):
    """The informational root is not a health endpoint and must be protected."""
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY", "test-api-key-" + "x" * 32)
    assert client.get("/").status_code == 401

def test_health(client):
    """Test health endpoint"""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "DeepSeek R1" in data["model"]
    assert "chat" in data["endpoints"]
