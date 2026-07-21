from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


class ReadyChecks(BaseModel):
    configuration: str
    application: str
    database: str


class ReadyResponse(BaseModel):
    status: str
    checks: ReadyChecks
