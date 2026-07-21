from fastapi import HTTPException
from pydantic import BaseModel

from app.core.exceptions import ResourceNotFoundError


async def test_app_exception_returns_standard_envelope(app, client):
    @app.get("/__test__/not-found")
    def _raise_not_found():
        raise ResourceNotFoundError(code="example_not_found", message="Example not found")

    response = await client.get("/__test__/not-found")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "example_not_found"
    assert error["message"] == "Example not found"
    assert error["details"] is None
    assert error["requestId"]
    assert response.headers.get("x-request-id") == error["requestId"]


async def test_http_exception_returns_standard_envelope(app, client):
    @app.get("/__test__/http-exception")
    def _raise_http_exception():
        raise HTTPException(status_code=400, detail="Bad request")

    response = await client.get("/__test__/http-exception")

    assert response.status_code == 400
    error = response.json()["error"]
    # Matches the existing status-to-code mapping in app.api.errors.
    assert error["code"] == "bad_request"
    assert error["message"] == "Bad request"
    assert error["details"] is None
    assert response.headers.get("x-request-id") == error["requestId"]


async def test_validation_error_returns_normalized_details(app, client):
    class _TestBody(BaseModel):
        title: str

    @app.post("/__test__/validate")
    def _validate(body: _TestBody):
        return {"title": body.title}

    response = await client.post("/__test__/validate", json={"title": 12345})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"] == "The request contains invalid values."
    assert isinstance(error["details"], list)
    assert error["details"][0]["field"] == "title"
    assert "12345" not in response.text
    assert response.headers.get("x-request-id") == error["requestId"]


async def test_unexpected_exception_uses_safe_error_envelope(app, client):
    @app.get("/__test__/boom")
    def _raise_unexpected():
        raise RuntimeError("private test failure")

    response = await client.get("/__test__/boom")

    assert response.status_code == 500
    error = response.json()["error"]
    assert error["code"] == "internal_error"
    assert error["message"] == "An unexpected error occurred."
    assert error["details"] is None
    assert "private test failure" not in response.text
    assert response.headers.get("x-request-id") == error["requestId"]
