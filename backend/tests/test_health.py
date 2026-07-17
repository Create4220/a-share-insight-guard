"""Test health endpoint."""


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert "A-Share Insight Guard" in data["data"]["app_name"]
