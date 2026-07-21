from sqlalchemy import text

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.database.engine import engine
from app.schemas.system import HealthResponse, ReadyChecks, ReadyResponse


def check_health() -> HealthResponse:
    return HealthResponse(status="ok")


async def check_database() -> None:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception as exc:
        raise ServiceUnavailableError(
            code="database_unavailable",
            message="Database is unavailable",
        ) from exc


async def check_readiness() -> ReadyResponse:
    # Raises if application configuration cannot be loaded.
    get_settings()
    await check_database()
    return ReadyResponse(
        status="ready",
        checks=ReadyChecks(configuration="ok", application="ok", database="ok"),
    )
