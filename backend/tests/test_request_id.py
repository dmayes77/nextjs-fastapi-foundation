import uuid


async def test_generated_request_id_is_a_valid_uuid(client):
    response = await client.get("/")

    request_id = response.headers.get("x-request-id")
    assert request_id
    # Raises ValueError if not a valid UUID.
    uuid.UUID(request_id)


async def test_valid_request_id_is_preserved(client):
    response = await client.get("/", headers={"X-Request-ID": "test-request-123"})

    assert response.headers.get("x-request-id") == "test-request-123"


async def test_invalid_request_id_is_replaced(client):
    response = await client.get("/", headers={"X-Request-ID": "bad id with spaces"})

    assert response.status_code == 200
    request_id = response.headers.get("x-request-id")
    assert request_id
    assert request_id != "bad id with spaces"
    uuid.UUID(request_id)


async def test_excessively_long_request_id_is_replaced(client):
    long_id = "a" * 200

    response = await client.get("/", headers={"X-Request-ID": long_id})

    assert response.status_code == 200
    request_id = response.headers.get("x-request-id")
    assert request_id
    assert request_id != long_id
    uuid.UUID(request_id)
