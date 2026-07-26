from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError, TimeoutError as SQLAlchemyTimeoutError

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


async def test_database_operational_error_uses_safe_503_envelope(app, client):
    @app.get("/__test__/database-operational-error")
    def _raise_database_operational_error():
        raise OperationalError(
            "SELECT private_column FROM private_table",
            {},
            ConnectionRefusedError(
                "connection to 127.0.0.1:5432 failed for private-user"
            ),
        )

    response = await client.get(
        "/__test__/database-operational-error",
        headers={"X-Request-ID": "database-test-503"},
    )

    assert response.status_code == 503
    error = response.json()["error"]
    assert error == {
        "code": "database_unavailable",
        "message": "The database is temporarily unavailable.",
        "details": None,
        "requestId": "database-test-503",
    }
    assert response.headers.get("x-request-id") == "database-test-503"
    assert "private_column" not in response.text
    assert "127.0.0.1" not in response.text
    assert "private-user" not in response.text


async def test_database_pool_timeout_uses_safe_503_envelope(app, client):
    @app.get("/__test__/database-pool-timeout")
    def _raise_database_pool_timeout():
        raise SQLAlchemyTimeoutError("private pool state")

    response = await client.get("/__test__/database-pool-timeout")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
    assert "private pool state" not in response.text
