import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    HistoryItem,
    MonitorCreate,
    MonitorDetail,
    MonitorRequest,
    MonitorResponse,
    MonitorSummary,
    MonitorUpdate,
)
from app.monitor import run_check
from app.storage import (
    create_monitor,
    delete_monitor,
    get_enabled_monitors,
    get_last_hash_by_id,
    get_monitor,
    get_monitor_by_target,
    get_monitor_history,
    init_db,
    list_monitors,
    log_check,
    set_test_mode,
    update_monitor,
    update_monitor_status,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("monitor-api")

app = FastAPI(title="Website Structure Monitoring")
scheduler = BackgroundScheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    scheduler.add_job(run_scheduled_checks, "interval", minutes=1, id="monitor-scheduler")
    scheduler.start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    scheduler.shutdown()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/monitor", response_model=MonitorResponse)
def monitor(request: MonitorRequest) -> MonitorResponse:
    monitor_row = get_monitor_by_target(str(request.url), request.selector)
    if monitor_row is None:
        monitor_id = create_monitor(
            name=f"Ad hoc: {request.url}",
            url=str(request.url),
            selector=request.selector,
            interval_minutes=60,
            enabled=True,
        )
    else:
        monitor_id = int(monitor_row["id"])

    result = perform_check(monitor_id)
    return MonitorResponse(
        url=request.url,
        selector=request.selector,
        changed=result["changed"],
        missing_data=result["missing_data"],
        message=result["message"],
        previous_hash=result["previous_hash"],
        current_hash=result["current_hash"],
    )


@app.get("/history")
def history(url: str, selector: str | None = None, limit: int = 20) -> dict:
    monitor_row = get_monitor_by_target(url, selector)
    if monitor_row is None:
        return {"url": url, "selector": selector, "items": []}
    items = _history_items(int(monitor_row["id"]), limit)
    return {
        "url": url,
        "selector": selector,
        "items": items,
    }


@app.post("/monitors", response_model=MonitorDetail)
def create_monitor_endpoint(payload: MonitorCreate) -> MonitorDetail:
    monitor_id = create_monitor(
        name=payload.name,
        url=str(payload.url),
        selector=payload.selector,
        interval_minutes=payload.interval_minutes,
        enabled=payload.enabled,
    )
    return _monitor_detail(monitor_id)


@app.get("/monitors", response_model=list[MonitorSummary])
def list_monitors_endpoint() -> list[MonitorSummary]:
    return [_monitor_summary(row) for row in list_monitors()]


@app.get("/monitors/{monitor_id}", response_model=MonitorDetail)
def get_monitor_endpoint(monitor_id: int) -> MonitorDetail:
    return _monitor_detail(monitor_id)


@app.put("/monitors/{monitor_id}", response_model=MonitorDetail)
def update_monitor_endpoint(monitor_id: int, payload: MonitorUpdate) -> MonitorDetail:
    updated = update_monitor(monitor_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return _monitor_detail(monitor_id)


@app.delete("/monitors/{monitor_id}")
def delete_monitor_endpoint(monitor_id: int) -> dict:
    deleted = delete_monitor(monitor_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return {"status": "deleted"}


@app.post("/monitors/{monitor_id}/check", response_model=MonitorDetail)
def check_monitor_endpoint(monitor_id: int) -> MonitorDetail:
    perform_check(monitor_id)
    return _monitor_detail(monitor_id)


@app.post("/monitors/{monitor_id}/simulate", response_model=MonitorDetail)
def simulate_monitor_endpoint(monitor_id: int) -> MonitorDetail:
    set_test_mode(monitor_id, True)
    perform_check(monitor_id)
    return _monitor_detail(monitor_id)


@app.post("/monitors/{monitor_id}/revert", response_model=MonitorDetail)
def revert_monitor_endpoint(monitor_id: int) -> MonitorDetail:
    set_test_mode(monitor_id, False)
    perform_check(monitor_id)
    return _monitor_detail(monitor_id)


@app.get("/monitors/{monitor_id}/history", response_model=list[HistoryItem])
def monitor_history_endpoint(monitor_id: int, limit: int = 10) -> list[HistoryItem]:
    return _history_items(monitor_id, limit)


def _monitor_summary(row: dict) -> MonitorSummary:
    return MonitorSummary(
        id=row["id"],
        name=row["name"],
        url=row["url"],
        selector=row.get("selector"),
        interval_minutes=row["interval_minutes"],
        enabled=bool(row["enabled"]),
        last_checked=_to_datetime(row.get("last_checked")),
        last_changed=bool(row["last_changed"]) if row.get("last_changed") is not None else None,
        last_message=row.get("last_message"),
        test_mode=bool(row.get("test_mode")),
    )


def _monitor_detail(monitor_id: int) -> MonitorDetail:
    row = get_monitor(monitor_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return MonitorDetail(
        **_monitor_summary(row).model_dump(),
        history=_history_items(monitor_id, 10),
    )


def _history_items(monitor_id: int, limit: int) -> list[HistoryItem]:
    history = get_monitor_history(monitor_id, limit)
    return [
        HistoryItem(
            hash=item.get("hash"),
            changed=bool(item["changed"]),
            missing_data=bool(item["missing_data"]),
            message=item["message"],
            checked_at=_to_datetime(item["checked_at"]),
            is_test=bool(item["is_test"]),
        )
        for item in history
    ]


def _to_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def perform_check(monitor_id: int) -> dict:
    row = get_monitor(monitor_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Monitor not found")

    url = row["url"]
    selector = row.get("selector")
    test_mode = bool(row.get("test_mode"))

    try:
        current_hash, missing = run_check(url, selector)
    except Exception as exc:
        logger.exception("Monitoring failed")
        raise HTTPException(status_code=500, detail="Monitoring failed") from exc

    if test_mode:
        current_hash = f"{current_hash}-test" if current_hash else "test"

    previous_hash = get_last_hash_by_id(monitor_id)
    changed = bool(previous_hash and current_hash and previous_hash != current_hash)
    message = "Structure changed" if changed else "No change detected"
    if missing:
        message = "Missing data for selector or body"
        changed = False

    checked_at = datetime.utcnow().isoformat()
    logger.info(f"Monitor {monitor_id}: prev_hash={previous_hash}, current_hash={current_hash}, changed={changed}, missing={missing}")
    update_monitor_status(monitor_id, current_hash, checked_at)
    log_check(
        monitor_id,
        current_hash,
        changed,
        missing,
        message,
        checked_at,
        test_mode,
    )

    return {
        "previous_hash": previous_hash,
        "current_hash": current_hash,
        "changed": changed,
        "missing_data": missing,
        "message": message,
    }


def run_scheduled_checks() -> None:
    now = datetime.utcnow()
    for monitor in get_enabled_monitors():
        last_checked = _to_datetime(monitor.get("last_checked"))
        interval = monitor.get("interval_minutes") or 60
        due = last_checked is None or (now - last_checked) >= timedelta(minutes=interval)
        if due:
            try:
                perform_check(int(monitor["id"]))
            except Exception:
                logger.exception("Scheduled check failed for monitor_id=%s", monitor["id"])
