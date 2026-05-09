import importlib
import os


def _load_storage(tmp_path):
    os.environ["MONITOR_DB_PATH"] = str(tmp_path / "test.db")
    import app.storage as storage

    return importlib.reload(storage)


def test_create_and_update_monitor(tmp_path):
    storage = _load_storage(tmp_path)
    storage.init_db()

    monitor_id = storage.create_monitor(
        name="Homepage",
        url="https://example.com",
        selector=None,
        interval_minutes=30,
        enabled=True,
    )

    monitors = storage.list_monitors()
    assert len(monitors) == 1
    assert monitors[0]["id"] == monitor_id

    updated = storage.update_monitor(monitor_id, {"enabled": 0})
    assert updated is True

    monitor = storage.get_monitor(monitor_id)
    assert monitor["enabled"] == 0


def test_log_history(tmp_path):
    storage = _load_storage(tmp_path)
    storage.init_db()

    monitor_id = storage.create_monitor(
        name="Header",
        url="https://example.com",
        selector="#main",
        interval_minutes=15,
        enabled=True,
    )

    storage.log_check(
        monitor_id=monitor_id,
        current_hash="abc",
        changed=False,
        missing_data=False,
        message="No change",
        checked_at="2024-01-01T00:00:00",
        is_test=False,
    )

    history = storage.get_monitor_history(monitor_id, limit=5)
    assert len(history) == 1
    assert history[0]["hash"] == "abc"
