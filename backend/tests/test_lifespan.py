from unittest.mock import AsyncMock

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
