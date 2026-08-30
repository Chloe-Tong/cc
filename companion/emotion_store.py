import sqlite3

from cc.db import open_db
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class EmotionState:
    id: int
    primary: str
    secondary: Optional[str]
    intensity: float          # 0.0–1.0
    trigger: Optional[str]
    drifting_toward: Optional[str]
    created_at: float = field(default_factory=time.time)


class EmotionStore:
    def __init__(self, db_path: str | Path):
        self._db = str(db_path)
        self._init()

    def _conn(self):
        return open_db(self._db)

    def _init(self):
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS emotion_states (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    primary_emotion TEXT NOT NULL,
                    secondary       TEXT,
                    intensity       REAL NOT NULL,
                    trigger         TEXT,
                    drifting_toward TEXT,
                    created_at      REAL NOT NULL
                )
            """)

    def set(self, primary: str, intensity: float,
            secondary: str | None = None,
            trigger: str | None = None,
            drifting_toward: str | None = None) -> EmotionState:
        now = time.time()
        with self._conn() as c:
            cur = c.execute(
                """INSERT INTO emotion_states
                   (primary_emotion, secondary, intensity, trigger, drifting_toward, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (primary, secondary, intensity, trigger, drifting_toward, now),
            )
        return EmotionState(
            id=cur.lastrowid, primary=primary, secondary=secondary,
            intensity=intensity, trigger=trigger,
            drifting_toward=drifting_toward, created_at=now,
        )

    def current(self) -> Optional[EmotionState]:
        with self._conn() as c:
            row = c.execute(
                "SELECT * FROM emotion_states ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
        return self._row(row) if row else None

    def history(self, hours: float = 24.0) -> list[EmotionState]:
        since = time.time() - hours * 3600
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM emotion_states WHERE created_at >= ? ORDER BY created_at ASC",
                (since,),
            ).fetchall()
        return [self._row(r) for r in rows]

    @staticmethod
    def _row(r: sqlite3.Row) -> EmotionState:
        return EmotionState(
            id=r["id"], primary=r["primary_emotion"], secondary=r["secondary"],
            intensity=r["intensity"], trigger=r["trigger"],
            drifting_toward=r["drifting_toward"], created_at=r["created_at"],
        )
