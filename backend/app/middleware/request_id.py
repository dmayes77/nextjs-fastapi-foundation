import logging
import string
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.request_context import reset_request_id, set_request_id

logger = logging.getLogger("app.request")

REQUEST_ID_HEADER = "X-Request-ID"
MAX_REQUEST_ID_LENGTH = 128
_ALLOWED_CHARS = frozenset(string.ascii_letters + string.digits + "-_.")


def _is_valid_request_id(value: str) -> bool:
    if not value or len(value) > MAX_REQUEST_ID_LENGTH:
        return False
    return all(char in _ALLOWED_CHARS for char in value)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming if _is_valid_request_id(incoming) else str(uuid.uuid4())

        token = set_request_id(request_id)
        start = time.perf_counter()
        logger.info("request started method=%s path=%s", request.method, request.url.path)
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            response.headers[REQUEST_ID_HEADER] = request_id
            logger.info(
                "request completed method=%s path=%s status=%s duration_ms=%.1f",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "request failed method=%s path=%s duration_ms=%.1f",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise
        finally:
            reset_request_id(token)
