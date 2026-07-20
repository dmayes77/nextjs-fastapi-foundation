from fastapi import FastAPI

from app.api.errors import register_exception_handlers
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIdMiddleware
from app.schemas.errors import ErrorResponse


def create_app() -> FastAPI:
    get_settings()
    configure_logging()
    app = FastAPI(responses={"default": {"model": ErrorResponse}})
    register_exception_handlers(app)
    app.add_middleware(RequestIdMiddleware)
    app.include_router(api_router)
    return app


app = create_app()
