from fastapi import APIRouter

router = APIRouter(tags=["Root"])


@router.get("/", summary="Root", operation_id="root_get")
def root():
    return {"message": "Hello World"}
