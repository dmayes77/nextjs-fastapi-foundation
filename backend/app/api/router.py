from fastapi import APIRouter

from app.api.routes import root, system

api_router = APIRouter()
api_router.include_router(root.router)
api_router.include_router(system.router)
