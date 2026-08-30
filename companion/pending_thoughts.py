import sqlite3

from cc.db import open_db
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class PendingThought:
    id: int
    content: str
    priority: int             # 1 (low) – 3 (high)
    shared: bool
    created_at: float = field(default_factory=time.time)
    shared_at: Optional[float] = None


class PendingThoughtStore:
    def __init__(self, db_path: str | Path):
        self._db = str(db_path)
        self._init()

    def _conn(self):
        return open_db(self._db)

    def _init(self):
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS pending_thoughts (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    content    TEXT NOT NULL,
                    priority   INTEGER NOT NULL DEFAULT 1,
                    shared     INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL,
                    shared_at  REAL
                )
            """)

    def save(self, content: str, priority: int = 1) -> PendingThought:
        now = time.time()
        with self._conn() as c:
            cur = c.execute(
                "INSERT INTO pending_thoughts (content, priority, shared, created_at) VALUES (?, ?, 0, ?)",
                (content, priority, now),
            )
        return PendingThought(id=cur.lastrowid, content=content, priority=priority,
                              shared=False, created_at=now)

    def pending(self) -> list[PendingThought]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM pending_thoughts WHERE shared=0 ORDER BY priority DESC, created_at ASC"
            ).fetchall()
        return [self._row(r) for r in rows]

    def mark_shared(self, thought_id: int) -> bool:
        now = time.time()
        with self._conn() as c:
            c.execute(
                "UPDATE pending_thoughts SET shared=1, shared_at=? WHERE id=?",
                (now, thought_id),
            )
        return True

    @staticmethod
    def _row(r: sqlite3.Row) -> PendingThought:
        return PendingThought(
            id=r["id"], content=r["content"], priority=r["priority"],
            shared=bool(r["shared"]), created_at=r["created_at"],
            shared_at=r["shared_at"],
        )
