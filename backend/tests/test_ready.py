from app.core.exceptions import ServiceUnavailableError
from app.services import system


async def test_ready_returns_database_status_when_database_is_reachable(client, monkeypatch):
    async def successful_check_database() -> None:
        return None

    monkeypatch.setattr(system, "check_database", successful_check_database)

    response = await client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {
            "configuration": "ok",
            "application": "ok",
            "database": "ok",
        },
    }
    assert response.headers.get("x-request-id")


async def test_ready_returns_503_when_database_is_unavailable(client, monkeypatch):
    async def failing_check_database() -> None:
        raise ServiceUnavailableError(
            code="database_unavailable",
            message="Database is unavailable",
        )

    monkeypatch.setattr(system, "check_database", failing_check_database)

    response = await client.get("/ready")

    assert response.status_code == 503
    body = response.json()
    error = body["error"]
    assert error["code"] == "database_unavailable"
    assert error["message"] == "Database is unavailable"
    assert error["details"] is None
    assert error["requestId"]

    request_id_header = response.headers.get("x-request-id")
    assert request_id_header
    assert request_id_header == error["requestId"]


async def test_ready_preserves_request_id_when_database_is_unavailable(client, monkeypatch):
    async def failing_check_database() -> None:
        raise ServiceUnavailableError(
            code="database_unavailable",
            message="Database is unavailable",
        )

    monkeypatch.setattr(system, "check_database", failing_check_database)

    response = await client.get("/ready", headers={"X-Request-ID": "ready-test-503"})

    assert response.status_code == 503
    assert response.headers.get("x-request-id") == "ready-test-503"
    assert response.json()["error"]["requestId"] == "ready-test-503"
