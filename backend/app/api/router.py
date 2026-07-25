from fastapi import APIRouter

from app.api.routes import projects, root, system

api_router = APIRouter()
api_router.include_router(root.router)
api_router.include_router(system.router)
api_router.include_router(projects.router)
