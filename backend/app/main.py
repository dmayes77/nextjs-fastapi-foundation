from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    get_settings()
    app = FastAPI()
    app.include_router(api_router)
    return app


app = create_app()
