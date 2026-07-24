import re

from fastapi import FastAPI
from fastapi.routing import APIRoute

from app.api.errors import register_exception_handlers
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIdMiddleware
from app.schemas.errors import ErrorResponse


def generate_operation_id(route: APIRoute) -> str:
    """Deterministic fallback for a route that does not set its own
    `operation_id` explicitly. Built only from the route's tag, path, and
    HTTP method — never from the Python handler function's name — so
    renaming a handler can never silently change the public OpenAPI
    contract or any client generated from it.

    Every route in this application is declared with exactly one HTTP
    method per `APIRoute` (a separate `@router.get`/`@router.post`/...
    decorator call per method, never `methods=["GET", "POST"]` on one
    route) — enforced by `tests/test_openapi.py`. `sorted()` still guards
    `route.methods` against Python's set iteration order regardless, since
    a single-element set only has one possible sort order anyway and this
    keeps the function itself correct independent of that convention.
    """
    tag = route.tags[0].lower().replace(" ", "_") if route.tags else "default"
    method = sorted(route.methods)[0].lower()
    path_suffix = re.sub(r"\W+", "_", route.path.strip("/")).strip("_") or "root"
    return f"{tag}_{path_suffix}_{method}"


def create_app() -> FastAPI:
    get_settings()
    configure_logging()
    app = FastAPI(
        responses={"default": {"model": ErrorResponse}},
        generate_unique_id_function=generate_operation_id,
    )
    register_exception_handlers(app)
    app.add_middleware(RequestIdMiddleware)
    app.include_router(api_router)
    return app


app = create_app()
