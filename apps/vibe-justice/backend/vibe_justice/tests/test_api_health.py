import pytest

def test_root(client):
    """Test root endpoint"""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Vibe-Justice Backend API"
    assert "/docs" in data["docs"]

def test_health(client):
    """Test health endpoint"""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "DeepSeek R1" in data["model"]
    assert "chat" in data["endpoints"]