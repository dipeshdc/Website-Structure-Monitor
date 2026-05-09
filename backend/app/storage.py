import os
import sqlite3
from datetime import datetime

DB_PATH = os.getenv("MONITOR_DB_PATH", "data/monitor.db")


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _get_columns(cur: sqlite3.Cursor, table: str) -> set[str]:
    cur.execute(f"PRAGMA table_info({table})")
    return {row["name"] for row in cur.fetchall()}


def _ensure_columns(cur: sqlite3.Cursor, table: str, columns: dict[str, str]) -> None:
    existing = _get_columns(cur, table)
    if not existing:
        return
    for column, definition in columns.items():
        if column not in existing:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {definition}")


def init_db() -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS monitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            selector TEXT,
            interval_minutes INTEGER NOT NULL DEFAULT 60,
            enabled INTEGER NOT NULL DEFAULT 1,
            test_mode INTEGER NOT NULL DEFAULT 0,
            last_hash TEXT,
            last_checked TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monitor_id INTEGER NOT NULL,
            hash TEXT,
            changed INTEGER NOT NULL,
            missing_data INTEGER NOT NULL,
            message TEXT NOT NULL,
            checked_at TEXT NOT NULL,
            is_test INTEGER NOT NULL
        )
        """
    )

    _ensure_columns(
        cur,
        "monitors",
        {
            "name": "name TEXT",
            "interval_minutes": "interval_minutes INTEGER NOT NULL DEFAULT 60",
            "enabled": "enabled INTEGER NOT NULL DEFAULT 1",
            "test_mode": "test_mode INTEGER NOT NULL DEFAULT 0",
            "created_at": "created_at TEXT",
            "updated_at": "updated_at TEXT",
        },
    )
    conn.commit()
    conn.close()


def create_monitor(
    name: str,
    url: str,
    selector: str | None,
    interval_minutes: int,
    enabled: bool,
) -> int:
    conn = _connect()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        """
        INSERT INTO monitors
        (name, url, selector, interval_minutes, enabled, test_mode, last_hash, last_checked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)
        """,
        (name, url, selector, interval_minutes, 1 if enabled else 0, now, now),
    )
    monitor_id = cur.lastrowid
    conn.commit()
    conn.close()
    return int(monitor_id)


def list_monitors() -> list[dict]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            m.id,
            m.name,
            m.url,
            m.selector,
            m.interval_minutes,
            m.enabled,
            m.test_mode,
            m.last_checked,
            c.changed AS last_changed,
            c.message AS last_message
        FROM monitors m
        LEFT JOIN checks c ON c.id = (
            SELECT id
            FROM checks
            WHERE monitor_id = m.id
            ORDER BY id DESC
            LIMIT 1
        )
        ORDER BY m.id DESC
        """
    )
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return rows


def get_monitor(monitor_id: int) -> dict | None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            m.id,
            m.name,
            m.url,
            m.selector,
            m.interval_minutes,
            m.enabled,
            m.test_mode,
            m.last_checked,
            c.changed AS last_changed,
            c.message AS last_message
        FROM monitors m
        LEFT JOIN checks c ON c.id = (
            SELECT id
            FROM checks
            WHERE monitor_id = m.id
            ORDER BY id DESC
            LIMIT 1
        )
        WHERE m.id = ?
        """,
        (monitor_id,),
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def get_monitor_by_target(url: str, selector: str | None) -> dict | None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, url, selector, interval_minutes, enabled, test_mode, last_checked
        FROM monitors
        WHERE url = ? AND selector IS ?
        """,
        (url, selector),
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_monitor(monitor_id: int, updates: dict) -> bool:
    if not updates:
        return False
    allowed = {"name", "url", "selector", "interval_minutes", "enabled"}
    fields = {key: value for key, value in updates.items() if key in allowed}
    if not fields:
        return False
    fields["updated_at"] = datetime.utcnow().isoformat()

    assignments = ", ".join([f"{key} = ?" for key in fields.keys()])
    values = list(fields.values())
    values.append(monitor_id)

    conn = _connect()
    cur = conn.cursor()
    cur.execute(f"UPDATE monitors SET {assignments} WHERE id = ?", values)
    conn.commit()
    updated = cur.rowcount > 0
    conn.close()
    return updated


def delete_monitor(monitor_id: int) -> bool:
    conn = _connect()
    cur = conn.cursor()
    cur.execute("DELETE FROM checks WHERE monitor_id = ?", (monitor_id,))
    cur.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def set_test_mode(monitor_id: int, enabled: bool) -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "UPDATE monitors SET test_mode = ?, updated_at = ? WHERE id = ?",
        (1 if enabled else 0, datetime.utcnow().isoformat(), monitor_id),
    )
    conn.commit()
    conn.close()


def update_monitor_status(monitor_id: int, current_hash: str | None, checked_at: str) -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "UPDATE monitors SET last_hash = ?, last_checked = ?, updated_at = ? WHERE id = ?",
        (current_hash, checked_at, datetime.utcnow().isoformat(), monitor_id),
    )
    conn.commit()
    conn.close()


def log_check(
    monitor_id: int,
    current_hash: str | None,
    changed: bool,
    missing_data: bool,
    message: str,
    checked_at: str,
    is_test: bool,
) -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO checks (monitor_id, hash, changed, missing_data, message, checked_at, is_test)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            monitor_id,
            current_hash,
            1 if changed else 0,
            1 if missing_data else 0,
            message,
            checked_at,
            1 if is_test else 0,
        ),
    )
    conn.commit()
    conn.close()


def get_monitor_history(monitor_id: int, limit: int = 10) -> list[dict]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT hash, changed, missing_data, message, checked_at, is_test
        FROM checks
        WHERE monitor_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (monitor_id, limit),
    )
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return rows


def get_enabled_monitors() -> list[dict]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, url, selector, interval_minutes, last_hash, last_checked, test_mode
        FROM monitors
        WHERE enabled = 1
        """
    )
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return rows


def get_last_hash_by_id(monitor_id: int) -> str | None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute("SELECT last_hash FROM monitors WHERE id = ?", (monitor_id,))
    row = cur.fetchone()
    conn.close()
    return row["last_hash"] if row else None
