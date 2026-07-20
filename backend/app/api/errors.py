import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException
from app.core.request_context import REQUEST_ID_HEADER, get_request_id, set_request_id
from app.schemas.errors import ErrorDetail, ErrorResponse

logger = logging.getLogger("app.error")

_STATUS_CODE_TO_ERROR_CODE = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "unprocessable_entity",
}

_LOCATION_PREFIXES = {"body", "query", "path", "header"}


def _current_request_id(request: Request) -> str:
    # Bare `Exception`s are handled by the outer ServerErrorMiddleware, which
    # runs after the request-scoped context var has already been reset, so
    # request.state (set earlier by the middleware) is checked first.
    state_request_id = getattr(request.state, "request_id", None)
    return state_request_id or get_request_id() or "-"


def _error_response(
    *, request: Request, code: str, message: str, details: object | None, status_code: int
) -> JSONResponse:
    request_id = _current_request_id(request)
    body = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            details=details,
            requestId=request_id,
        )
    )
    response = JSONResponse(status_code=status_code, content=body.model_dump(by_alias=True))
    response.headers[REQUEST_ID_HEADER] = request_id
    return response


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return _error_response(
        request=request,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        status_code=exc.status_code,
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = _STATUS_CODE_TO_ERROR_CODE.get(exc.status_code, "http_error")
    if isinstance(exc.detail, str):
        message = exc.detail
        details = None
    else:
        message = "An error occurred while processing the request."
        details = exc.detail
    return _error_response(
        request=request, code=code, message=message, details=details, status_code=exc.status_code
    )


def _format_field_path(loc: tuple) -> str:
    parts = [str(part) for part in loc if part not in _LOCATION_PREFIXES]
    if not parts:
        parts = [str(part) for part in loc]
    return ".".join(parts)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {
            "field": _format_field_path(error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return _error_response(
        request=request,
        code="validation_error",
        message="The request contains invalid values.",
        details=details,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Restore the request ID into context so the log line below is
    # correlated correctly; the middleware already reset it by this point.
    set_request_id(_current_request_id(request))
    logger.exception("unhandled exception method=%s path=%s", request.method, request.url.path)
    return _error_response(
        request=request,
        code="internal_error",
        message="An unexpected error occurred.",
        details=None,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
