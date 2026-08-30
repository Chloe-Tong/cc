import sqlite3

from cc.db import open_db
import time
from dataclasses import dataclass, field
from pathlib import Path

VISIBILITIES = {"public", "private"}


@dataclass
class InnerThought:
    id: int
    content: str
    visibility: str   # "public" | "private"
    created_at: float = field(default_factory=time.time)


class InnerThoughtStore:
    """
    晓的内心独白——自言自语，不是写给用户的话。
    visibility="public"  : 在 dashboard 可见（但仍是独白，不是对话）
    visibility="private" : 完全私密，dashboard 只显示"私密想法"占位
    """

    def __init__(self, db_path: str | Path):
        self._db = str(db_path)
        self._init()

    def _conn(self):
        return open_db(self._db)

    def _init(self):
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS inner_thoughts (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    content     TEXT NOT NULL,
                    visibility  TEXT NOT NULL DEFAULT 'public',
                    created_at  REAL NOT NULL
                )
            """)

    def write(self, content: str, visibility: str = "public") -> InnerThought:
        if visibility not in VISIBILITIES:
            visibility = "public"
        now = time.time()
        with self._conn() as c:
            cur = c.execute(
                "INSERT INTO inner_thoughts (content, visibility, created_at) VALUES (?, ?, ?)",
                (content, visibility, now),
            )
        return InnerThought(id=cur.lastrowid, content=content,
                            visibility=visibility, created_at=now)

    def recent(self, limit: int = 20,
               visibility: str | None = None) -> list[InnerThought]:
        with self._conn() as c:
            if visibility:
                rows = c.execute(
                    "SELECT * FROM inner_thoughts WHERE visibility=? "
                    "ORDER BY created_at DESC LIMIT ?",
                    (visibility, limit),
                ).fetchall()
            else:
                rows = c.execute(
                    "SELECT * FROM inner_thoughts ORDER BY created_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()
        return [self._row(r) for r in rows]

    def count_by_visibility(self) -> dict[str, int]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT visibility, COUNT(*) as n FROM inner_thoughts GROUP BY visibility"
            ).fetchall()
        return {r["visibility"]: r["n"] for r in rows}

    @staticmethod
    def _row(r: sqlite3.Row) -> InnerThought:
        return InnerThought(
            id=r["id"], content=r["content"],
            visibility=r["visibility"], created_at=r["created_at"],
        )
