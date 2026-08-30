import hashlib
import sqlite3
import json
import threading
from pathlib import Path
from typing import Optional

from .db import open_db
from .models import Event


def content_fingerprint(content: str) -> str:
    """内容指纹，用于去重时代替整段正文，省内存。"""
    return hashlib.blake2b(content.encode("utf-8"), digest_size=16).hexdigest()


class GlobalEventLog:
    """Append-only global event log. All windows write here; seq is commit order."""

    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._lock = threading.Lock()
        self._init_db()

    def _conn(self):
        return open_db(self._db_path)

    def _init_db(self):
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    seq          INTEGER PRIMARY KEY AUTOINCREMENT,
                    actor        TEXT NOT NULL,
                    source       TEXT NOT NULL,
                    scope        TEXT NOT NULL,
                    audience     TEXT NOT NULL,
                    content      TEXT NOT NULL,
                    based_on_seq INTEGER NOT NULL,
                    created_at   REAL NOT NULL
                )
            """)

    def append(self, event: Event) -> Event:
        """Write-ahead: insert, confirm, then return with assigned seq."""
        with self._lock:
            with self._conn() as conn:
                cur = conn.execute(
                    """INSERT INTO events
                       (actor, source, scope, audience, content, based_on_seq, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        event.actor,
                        event.source,
                        event.scope,
                        json.dumps(event.audience),
                        event.content,
                        event.based_on_seq,
                        event.created_at,
                    ),
                )
                event.seq = cur.lastrowid
        return event

    def append_many(self, events: list[Event]) -> int:
        """批量写入，单事务单连接。用于导入，避免逐条 append 的连接开销。"""
        if not events:
            return 0
        rows = [
            (
                e.actor, e.source, e.scope, json.dumps(e.audience),
                e.content, e.based_on_seq, e.created_at,
            )
            for e in events
        ]
        with self._lock:
            with self._conn() as conn:
                conn.executemany(
                    """INSERT INTO events
                       (actor, source, scope, audience, content, based_on_seq, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    rows,
                )
        return len(rows)

    def dedup_keys(self) -> set[tuple[str, str, int]]:
        """一次扫描建立 (actor, content 指纹, 分钟桶) 集合，供导入去重使用。

        逐条 SELECT 查重是 O(n²) 且每次开新连接；这里一次读完放进内存集合。
        """
        keys: set[tuple[str, str, int]] = set()
        with self._conn() as conn:
            for actor, content, ts in conn.execute(
                "SELECT actor, content, created_at FROM events"
            ):
                keys.add((actor, content_fingerprint(content), int(ts // 60)))
        return keys

    def head_seq(self) -> int:
        with self._conn() as conn:
            row = conn.execute("SELECT MAX(seq) FROM events").fetchone()
            return row[0] or 0

    def range(
        self,
        after_seq: int,
        through_seq: Optional[int] = None,
        scopes: Optional[set[str]] = None,
        audience_includes: Optional[str] = None,
    ) -> list[Event]:
        """Return events with seq > after_seq (up to through_seq if given).

        scopes: restrict by scope field.
        audience_includes: only events whose audience contains this window_id or "*".
        """
        query = "SELECT * FROM events WHERE seq > ?"
        params: list = [after_seq]

        if through_seq is not None:
            query += " AND seq <= ?"
            params.append(through_seq)

        if scopes:
            placeholders = ",".join("?" * len(scopes))
            query += f" AND scope IN ({placeholders})"
            params.extend(scopes)

        query += " ORDER BY seq"

        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()

        events = [self._row_to_event(r) for r in rows]

        if audience_includes:
            events = [
                e for e in events
                if "*" in e.audience or audience_includes in e.audience
            ]

        return events

    def delete_by_seqs(self, seqs: list[int]) -> int:
        """Hard-delete events by seq. Returns number of rows deleted."""
        if not seqs:
            return 0
        with self._lock:
            with self._conn() as conn:
                placeholders = ",".join("?" * len(seqs))
                cur = conn.execute(
                    f"DELETE FROM events WHERE seq IN ({placeholders})", seqs
                )
                return cur.rowcount

    def tail(self, n: int, scopes: Optional[set[str]] = None) -> list[Event]:
        query = "SELECT * FROM (SELECT * FROM events"
        params: list = []

        if scopes:
            placeholders = ",".join("?" * len(scopes))
            query += f" WHERE scope IN ({placeholders})"
            params.extend(scopes)

        query += f" ORDER BY seq DESC LIMIT ?) ORDER BY seq"
        params.append(n)

        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
        return [self._row_to_event(r) for r in rows]

    @staticmethod
    def _row_to_event(row: sqlite3.Row) -> Event:
        return Event(
            seq=row["seq"],
            actor=row["actor"],
            source=row["source"],
            scope=row["scope"],
            audience=json.loads(row["audience"]),
            content=row["content"],
            based_on_seq=row["based_on_seq"],
            created_at=row["created_at"],
        )
