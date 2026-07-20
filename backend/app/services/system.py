from app.core.config import get_settings
from app.schemas.system import HealthResponse, ReadyChecks, ReadyResponse


def check_health() -> HealthResponse:
    return HealthResponse(status="ok")


def check_readiness() -> ReadyResponse:
    # Raises if application configuration cannot be loaded.
    get_settings()
    return ReadyResponse(
        status="ready",
        checks=ReadyChecks(configuration="ok", application="ok"),
    )
