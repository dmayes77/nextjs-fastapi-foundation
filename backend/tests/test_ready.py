from sqlalchemy.exc import OperationalError

from app.services import system


async def test_ready_returns_database_status_when_database_is_reachable(
    client, monkeypatch
):
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
        raise OperationalError(
            "SELECT 1",
            {},
            ConnectionRefusedError(
                "connection to 127.0.0.1:5432 failed for private-user"
            ),
        )

    monkeypatch.setattr(system, "check_database", failing_check_database)

    response = await client.get("/ready")

    assert response.status_code == 503
    body = response.json()
    error = body["error"]
    assert error["code"] == "database_unavailable"
    assert error["message"] == "The database is temporarily unavailable."
    assert error["details"] is None
    assert error["requestId"]
    assert "127.0.0.1" not in response.text
    assert "private-user" not in response.text
    assert "SELECT 1" not in response.text

    request_id_header = response.headers.get("x-request-id")
    assert request_id_header
    assert request_id_header == error["requestId"]


async def test_ready_preserves_request_id_when_database_is_unavailable(
    client, monkeypatch
):
    async def failing_check_database() -> None:
        raise OperationalError("SELECT 1", {}, ConnectionRefusedError())

    monkeypatch.setattr(system, "check_database", failing_check_database)

    response = await client.get("/ready", headers={"X-Request-ID": "ready-test-503"})

    assert response.status_code == 503
    assert response.headers.get("x-request-id") == "ready-test-503"
    assert response.json()["error"]["requestId"] == "ready-test-503"


async def test_ready_preserves_unexpected_failures_as_500(client, monkeypatch):
    async def unexpected_check_database_failure() -> None:
        raise RuntimeError("private readiness defect")

    monkeypatch.setattr(system, "check_database", unexpected_check_database_failure)

    response = await client.get("/ready")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "private readiness defect" not in response.text
