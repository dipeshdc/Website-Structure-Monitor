import logging
from fastapi import FastAPI, HTTPException

from app.models import MonitorRequest, MonitorResponse
from app.monitor import run_check
from app.storage import add_history, get_history, get_last_hash, init_db, upsert_monitor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("monitor-api")

app = FastAPI(title="Website Structure Monitoring")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/monitor", response_model=MonitorResponse)
def monitor(request: MonitorRequest) -> MonitorResponse:
    try:
        current_hash, missing = run_check(str(request.url), request.selector)
    except Exception as exc:
        logger.exception("Monitoring failed")
        raise HTTPException(status_code=500, detail="Monitoring failed") from exc

    previous_hash = get_last_hash(str(request.url), request.selector)
    changed = bool(previous_hash and current_hash and previous_hash != current_hash)

    upsert_monitor(str(request.url), request.selector, current_hash)
    add_history(str(request.url), request.selector, current_hash, changed)

    message = "Structure changed" if changed else "No change detected"
    if missing:
        message = "Missing data for selector or body"

    return MonitorResponse(
        url=request.url,
        selector=request.selector,
        changed=changed,
        missing_data=missing,
        message=message,
        previous_hash=previous_hash,
        current_hash=current_hash,
    )


@app.get("/history")
def history(url: str, selector: str | None = None, limit: int = 20) -> dict:
    return {
        "url": url,
        "selector": selector,
        "items": get_history(url, selector, limit=limit),
    }
