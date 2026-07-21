async def test_root_returns_hello_world(client):
    response = await client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}


async def test_root_includes_request_id_header(client):
    response = await client.get("/")

    assert response.headers.get("x-request-id")
