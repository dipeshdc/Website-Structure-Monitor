from pydantic import BaseModel, HttpUrl


class MonitorRequest(BaseModel):
    url: HttpUrl
    selector: str | None = None


class MonitorResponse(BaseModel):
    url: HttpUrl
    selector: str | None
    changed: bool
    missing_data: bool
    message: str
    previous_hash: str | None
    current_hash: str | None
