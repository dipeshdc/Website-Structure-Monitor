from datetime import datetime

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


class MonitorCreate(BaseModel):
    name: str
    url: HttpUrl
    selector: str | None = None
    interval_minutes: int = 60
    enabled: bool = True


class MonitorUpdate(BaseModel):
    name: str | None = None
    url: HttpUrl | None = None
    selector: str | None = None
    interval_minutes: int | None = None
    enabled: bool | None = None


class MonitorSummary(BaseModel):
    id: int
    name: str
    url: HttpUrl
    selector: str | None
    interval_minutes: int
    enabled: bool
    last_checked: datetime | None
    last_changed: bool | None
    last_message: str | None
    test_mode: bool


class HistoryItem(BaseModel):
    hash: str | None
    changed: bool
    missing_data: bool
    message: str
    checked_at: datetime
    is_test: bool


class MonitorDetail(MonitorSummary):
    history: list[HistoryItem]
