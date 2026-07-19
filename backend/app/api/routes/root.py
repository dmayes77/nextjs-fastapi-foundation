from fastapi import APIRouter

router = APIRouter(tags=["Root"])


@router.get("/", summary="Root")
def root():
    return {"message": "Hello World"}
