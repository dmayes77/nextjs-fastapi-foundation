from app.services import system


async def test_health_returns_ok(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_health_includes_request_id_header(client):
    response = await client.get("/health")

    assert response.headers.get("x-request-id")


async def test_health_does_not_depend_on_database(client, monkeypatch):
    async def failing_check_database() -> None:
        raise RuntimeError("the database check should never run for /health")

    monkeypatch.setattr(system, "check_database", failing_check_database)

    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
