import sqlite3
import time
from dataclasses import dataclass, field
from pathlib import Path


CATEGORIES = {"behavior", "preference", "emotion", "relationship", "other"}


@dataclass
class Observation:
    id: int
    content: str
    category: str
    created_at: float = field(default_factory=time.time)


class ObservationLog:
    """林 records observations about the user from her own perspective."""

    def __init__(self, db_path: str | Path):
        self._db = str(db_path)
        self._init()

    def _conn(self):
        c = sqlite3.connect(self._db)
        c.row_factory = sqlite3.Row
        return c

    def _init(self):
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS observations (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    content    TEXT NOT NULL,
                    category   TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
            """)
            c.execute("CREATE INDEX IF NOT EXISTS idx_obs_cat ON observations(category)")

    def note(self, content: str, category: str = "other") -> Observation:
        if category not in CATEGORIES:
            category = "other"
        now = time.time()
        with self._conn() as c:
            cur = c.execute(
                "INSERT INTO observations (content, category, created_at) VALUES (?, ?, ?)",
                (content, category, now),
            )
        return Observation(id=cur.lastrowid, content=content, category=category, created_at=now)

    def recent(self, limit: int = 20, category: str | None = None) -> list[Observation]:
        with self._conn() as c:
            if category:
                rows = c.execute(
                    "SELECT * FROM observations WHERE category=? ORDER BY created_at DESC LIMIT ?",
                    (category, limit),
                ).fetchall()
            else:
                rows = c.execute(
                    "SELECT * FROM observations ORDER BY created_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()
        return [self._row(r) for r in rows]

    @staticmethod
    def _row(r: sqlite3.Row) -> Observation:
        return Observation(id=r["id"], content=r["content"],
                           category=r["category"], created_at=r["created_at"])
