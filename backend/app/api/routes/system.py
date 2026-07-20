from fastapi import APIRouter

from app.schemas.system import HealthResponse, ReadyResponse
from app.services import system

router = APIRouter(tags=["System"])


@router.get("/health", summary="Health", response_model=HealthResponse)
def health() -> HealthResponse:
    return system.check_health()


@router.get("/ready", summary="Readiness", response_model=ReadyResponse)
def ready() -> ReadyResponse:
    return system.check_readiness()
