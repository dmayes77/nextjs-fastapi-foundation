from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI

from app import main as main_module


async def test_lifespan_disposes_engine_exactly_once_on_shutdown(
    app: FastAPI, monkeypatch
):
    dispose = AsyncMock()
    fake_engine = type("FakeEngine", (), {"dispose": dispose})()
    monkeypatch.setattr(main_module, "engine", fake_engine)

    async with app.router.lifespan_context(app):
        dispose.assert_not_called()

    dispose.assert_awaited_once()


async def test_lifespan_disposes_engine_when_exiting_exceptionally(
    app: FastAPI, monkeypatch
):
    class _SentinelError(Exception):
        pass

    dispose = AsyncMock()
    fake_engine = type("FakeEngine", (), {"dispose": dispose})()
    monkeypatch.setattr(main_module, "engine", fake_engine)

    with pytest.raises(_SentinelError):
        async with app.router.lifespan_context(app):
            dispose.assert_not_called()
            raise _SentinelError("simulated failure during application runtime")

    dispose.assert_awaited_once()
