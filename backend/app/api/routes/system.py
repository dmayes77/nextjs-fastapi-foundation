from fastapi import APIRouter

from app.schemas.system import HealthResponse, ReadyResponse
from app.services import system

router = APIRouter(tags=["System"])


@router.get(
    "/health", summary="Health", response_model=HealthResponse, operation_id="health_get"
)
def health() -> HealthResponse:
    return system.check_health()


@router.get(
    "/ready", summary="Readiness", response_model=ReadyResponse, operation_id="ready_get"
)
async def ready() -> ReadyResponse:
    return await system.check_readiness()
