import sqlite3
import threading
import time
from pathlib import Path
from typing import Optional, Callable

from .db import open_db
from .models import Checkpoint, Event
from .event_log import GlobalEventLog


SummarizeFn = Callable[[list[Event], Optional[Checkpoint]], dict]


class CheckpointStore:
    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._init_db()

    def _conn(self):
        return open_db(self._db_path)

    def _init_db(self):
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS checkpoints (
                    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                    covered_through_seq  INTEGER NOT NULL,
                    layer_constant       TEXT NOT NULL,
                    layer_portrait       TEXT NOT NULL,
                    layer_midground      TEXT NOT NULL,
                    layer_recent         TEXT NOT NULL,
                    created_at           REAL NOT NULL
                )
            """)

    def save(self, cp: Checkpoint) -> Checkpoint:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO checkpoints
                   (covered_through_seq, layer_constant, layer_portrait,
                    layer_midground, layer_recent, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    cp.covered_through_seq,
                    cp.layer_constant,
                    cp.layer_portrait,
                    cp.layer_midground,
                    cp.layer_recent,
                    cp.created_at,
                ),
            )
            cp.id = cur.lastrowid
        return cp

    def latest(self) -> Optional[Checkpoint]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM checkpoints ORDER BY covered_through_seq DESC LIMIT 1"
            ).fetchone()
        return self._row_to_cp(row) if row else None

    def before_seq(self, seq: int) -> Optional[Checkpoint]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM checkpoints WHERE covered_through_seq <= ? ORDER BY covered_through_seq DESC LIMIT 1",
                (seq,),
            ).fetchone()
        return self._row_to_cp(row) if row else None

    @staticmethod
    def _row_to_cp(row: sqlite3.Row) -> Checkpoint:
        return Checkpoint(
            id=row["id"],
            covered_through_seq=row["covered_through_seq"],
            layer_constant=row["layer_constant"],
            layer_portrait=row["layer_portrait"],
            layer_midground=row["layer_midground"],
            layer_recent=row["layer_recent"],
            created_at=row["created_at"],
        )


class CheckpointWorker:
    """Generates checkpoints by message count or elapsed time.

    summarize_fn(events_since_last_cp, previous_cp) -> {
        constant, portrait, midground, recent
    }
    """

    def __init__(
        self,
        event_log: GlobalEventLog,
        store: CheckpointStore,
        summarize_fn: SummarizeFn,
        every_n_events: int = 50,
        every_seconds: float = 4 * 3600,
    ):
        self._log = event_log
        self._store = store
        self._summarize = summarize_fn
        self._every_n = every_n_events
        self._every_s = every_seconds
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def run_once(self) -> Optional[Checkpoint]:
        """Check if a new checkpoint is needed and generate one if so."""
        latest = self._store.latest()
        covered = latest.covered_through_seq if latest else 0
        head = self._log.head_seq()

        if head - covered < self._every_n:
            if latest is None:
                return None
            if (time.time() - latest.created_at) < self._every_s:
                return None

        new_events = self._log.range(covered, head)
        if not new_events:
            return None

        layers = self._summarize(new_events, latest)
        cp = Checkpoint(
            id=0,
            covered_through_seq=head,
            layer_constant=layers.get("constant", ""),
            layer_portrait=layers.get("portrait", ""),
            layer_midground=layers.get("midground", ""),
            layer_recent=layers.get("recent", ""),
            created_at=time.time(),
        )
        return self._store.save(cp)

    def start(self, poll_interval: float = 60.0):
        """Run in background thread, polling at poll_interval seconds."""
        self._stop.clear()

        def _loop():
            while not self._stop.wait(poll_interval):
                try:
                    self.run_once()
                except Exception:
                    pass

        self._thread = threading.Thread(target=_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join()
