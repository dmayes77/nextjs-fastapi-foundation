from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
from fastapi import FastAPI

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture
def app() -> FastAPI:
    """A fresh application per test so middleware, exception handlers, and
    dependency overrides never leak between tests."""
    return create_app()


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    # The application registers no lifespan/startup/shutdown handlers, so no
    # lifespan manager is needed here.
    #
    # raise_app_exceptions=False so an unhandled exception that escapes the
    # centralized 500 handler is returned as a normal Response (which
    # Starlette's ServerErrorMiddleware always re-raises after sending, for
    # server-side logging) rather than being raised into the test itself.
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Iterator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def clear_dependency_overrides(app: FastAPI) -> Iterator[None]:
    # Defensive cleanup only: the app fixture is already fresh per test, so
    # overrides never carry over in practice.
    yield
    app.dependency_overrides.clear()
