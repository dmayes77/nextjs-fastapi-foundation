from typing import Any


class AppException(Exception):
    code: str = "app_error"
    message: str = "Application error"
    status_code: int = 400

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: Any | None = None,
        status_code: int | None = None,
    ) -> None:
        self.code = code or self.code
        self.message = message or self.message
        self.details = details
        self.status_code = status_code or self.status_code
        super().__init__(self.message)


class ResourceNotFoundError(AppException):
    code = "resource_not_found"
    message = "Resource not found"
    status_code = 404


class ConflictError(AppException):
    code = "conflict"
    message = "Conflict"
    status_code = 409


class ForbiddenError(AppException):
    code = "forbidden"
    message = "Forbidden"
    status_code = 403


class UnauthorizedError(AppException):
    code = "unauthorized"
    message = "Unauthorized"
    status_code = 401


class ServiceUnavailableError(AppException):
    code = "service_unavailable"
    message = "Service unavailable"
    status_code = 503
