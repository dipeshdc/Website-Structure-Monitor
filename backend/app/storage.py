import os
import sqlite3
from datetime import datetime

DB_PATH = os.getenv("MONITOR_DB_PATH", "data/monitor.db")


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS monitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            selector TEXT,
            last_hash TEXT,
            last_checked TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            selector TEXT,
            hash TEXT,
            changed INTEGER,
            checked_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def get_last_hash(url: str, selector: str | None) -> str | None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "SELECT last_hash FROM monitors WHERE url = ? AND selector IS ?",
        (url, selector),
    )
    row = cur.fetchone()
    conn.close()
    return row["last_hash"] if row else None


def upsert_monitor(url: str, selector: str | None, current_hash: str | None) -> None:
    conn = _connect()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "SELECT id FROM monitors WHERE url = ? AND selector IS ?",
        (url, selector),
    )
    row = cur.fetchone()
    if row:
        cur.execute(
            "UPDATE monitors SET last_hash = ?, last_checked = ? WHERE id = ?",
            (current_hash, now, row["id"]),
        )
    else:
        cur.execute(
            "INSERT INTO monitors (url, selector, last_hash, last_checked) VALUES (?, ?, ?, ?)",
            (url, selector, current_hash, now),
        )
    conn.commit()
    conn.close()


def add_history(url: str, selector: str | None, current_hash: str | None, changed: bool) -> None:
    conn = _connect()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO history (url, selector, hash, changed, checked_at) VALUES (?, ?, ?, ?, ?)",
        (url, selector, current_hash, 1 if changed else 0, now),
    )
    conn.commit()
    conn.close()


def get_history(url: str, selector: str | None, limit: int = 20) -> list[dict]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT hash, changed, checked_at
        FROM history
        WHERE url = ? AND selector IS ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (url, selector, limit),
    )
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return rows
