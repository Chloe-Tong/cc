"""Storage for the '我们的家' features: diary, photo albums, MCP connectors.

Shares the same sqlite file as app/store.py (via its _connect() helper) but
owns its own tables, kept separate from the chat/session schema.
"""

import json
import os
import re
from datetime import datetime, timezone
from typing import Any

from app.store import _connect

_ENV_PLACEHOLDER = re.compile(r"^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$")


def resolve_connector_env(env: dict[str, str]) -> dict[str, str]:
    """Expands ${VAR_NAME} placeholders against the process environment, so
    secrets (like ELEVENLABS_API_KEY) live in .env, not duplicated in the DB."""
    resolved = {}
    for key, value in env.items():
        match = _ENV_PLACEHOLDER.match(value or "")
        resolved[key] = os.environ.get(match.group(1), "") if match else value
    return resolved


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def initialize_home_store() -> None:
    with _connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS diary_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author TEXT NOT NULL CHECK(author IN ('shasha', 'xiao')),
                entry_date TEXT NOT NULL,
                text TEXT NOT NULL,
                hidden_from_shasha INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS diary_entries_date
                ON diary_entries(entry_date);

            CREATE TABLE IF NOT EXISTS albums (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                is_private INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                album_id INTEGER NOT NULL
                    REFERENCES albums(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                uploaded_by TEXT NOT NULL CHECK(uploaded_by IN ('shasha', 'xiao')),
                caption TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS photos_album ON photos(album_id);

            CREATE TABLE IF NOT EXISTS mcp_connectors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                transport TEXT NOT NULL CHECK(transport IN ('stdio', 'sse', 'http')),
                command TEXT,
                args_json TEXT NOT NULL DEFAULT '[]',
                env_json TEXT NOT NULL DEFAULT '{}',
                url TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                builtin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        _seed_builtin_connectors(db)


def _seed_builtin_connectors(db) -> None:
    existing = db.execute(
        "SELECT 1 FROM mcp_connectors WHERE name = 'elevenlabs'"
    ).fetchone()
    if existing:
        return
    now = _now()
    db.execute(
        """
        INSERT INTO mcp_connectors
            (name, transport, command, args_json, env_json, url,
             enabled, builtin, created_at, updated_at)
        VALUES (?, 'stdio', 'uvx', ?, ?, NULL, 1, 1, ?, ?)
        """,
        (
            "elevenlabs",
            json.dumps(["elevenlabs-mcp"]),
            json.dumps({"ELEVENLABS_API_KEY": "${ELEVENLABS_API_KEY}"}),
            now,
            now,
        ),
    )


# ---------------------------------------------------------------- diary ----

def create_diary_entry(
    author: str,
    text: str,
    entry_date: str | None = None,
    hidden_from_shasha: bool = False,
) -> int:
    now = _now()
    date = entry_date or now[:10]
    with _connect() as db:
        cursor = db.execute(
            """
            INSERT INTO diary_entries
                (author, entry_date, text, hidden_from_shasha,
                 created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (author, date, text, int(bool(hidden_from_shasha) and author == "xiao"), now, now),
        )
        return int(cursor.lastrowid)


def list_diary_entries(viewer: str = "shasha") -> list[dict[str, Any]]:
    with _connect() as db:
        if viewer == "xiao":
            rows = db.execute(
                """
                SELECT id, author, entry_date, text, hidden_from_shasha,
                       created_at, updated_at
                FROM diary_entries
                ORDER BY entry_date DESC, id DESC
                """
            ).fetchall()
        else:
            rows = db.execute(
                """
                SELECT id, author, entry_date, text, hidden_from_shasha,
                       created_at, updated_at
                FROM diary_entries
                WHERE NOT (author = 'xiao' AND hidden_from_shasha = 1)
                ORDER BY entry_date DESC, id DESC
                """
            ).fetchall()
    return [dict(row) | {"hidden_from_shasha": bool(row["hidden_from_shasha"])} for row in rows]


def update_diary_entry(
    entry_id: int,
    text: str | None = None,
    hidden_from_shasha: bool | None = None,
) -> None:
    with _connect() as db:
        row = db.execute(
            "SELECT author FROM diary_entries WHERE id = ?", (entry_id,)
        ).fetchone()
        if not row:
            raise LookupError("diary entry not found")
        if text is not None:
            db.execute(
                "UPDATE diary_entries SET text = ?, updated_at = ? WHERE id = ?",
                (text, _now(), entry_id),
            )
        if hidden_from_shasha is not None and row["author"] == "xiao":
            db.execute(
                "UPDATE diary_entries SET hidden_from_shasha = ?, updated_at = ? WHERE id = ?",
                (int(bool(hidden_from_shasha)), _now(), entry_id),
            )


def delete_diary_entry(entry_id: int) -> None:
    with _connect() as db:
        db.execute("DELETE FROM diary_entries WHERE id = ?", (entry_id,))


# --------------------------------------------------------------- albums ----

def create_album(name: str, is_private: bool = False) -> int:
    now = _now()
    with _connect() as db:
        cursor = db.execute(
            """
            INSERT INTO albums (name, is_private, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (name.strip()[:120] or "未命名相册", int(bool(is_private)), now, now),
        )
        return int(cursor.lastrowid)


def list_albums(viewer: str = "shasha") -> list[dict[str, Any]]:
    with _connect() as db:
        if viewer == "xiao":
            rows = db.execute(
                """
                SELECT a.id, a.name, a.is_private, a.created_at, a.updated_at,
                       (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) AS photo_count
                FROM albums a
                ORDER BY a.updated_at DESC
                """
            ).fetchall()
        else:
            rows = db.execute(
                """
                SELECT a.id, a.name, a.is_private, a.created_at, a.updated_at,
                       (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) AS photo_count
                FROM albums a
                WHERE a.is_private = 0
                ORDER BY a.updated_at DESC
                """
            ).fetchall()
    return [dict(row) | {"is_private": bool(row["is_private"])} for row in rows]


def get_album(album_id: int) -> dict[str, Any] | None:
    with _connect() as db:
        row = db.execute(
            "SELECT id, name, is_private, created_at, updated_at FROM albums WHERE id = ?",
            (album_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row) | {"is_private": bool(row["is_private"])}


def rename_album(album_id: int, name: str) -> None:
    with _connect() as db:
        db.execute(
            "UPDATE albums SET name = ?, updated_at = ? WHERE id = ?",
            (name.strip()[:120] or "未命名相册", _now(), album_id),
        )


def set_album_private(album_id: int, is_private: bool) -> None:
    with _connect() as db:
        db.execute(
            "UPDATE albums SET is_private = ?, updated_at = ? WHERE id = ?",
            (int(bool(is_private)), _now(), album_id),
        )


def delete_album(album_id: int) -> list[str]:
    """Delete an album and its photo rows; returns file paths the caller
    should unlink from disk (only ones not referenced by any other row)."""
    with _connect() as db:
        paths = [
            row["path"]
            for row in db.execute(
                "SELECT path FROM photos WHERE album_id = ?", (album_id,)
            ).fetchall()
        ]
        db.execute("DELETE FROM albums WHERE id = ?", (album_id,))
        orphaned = [
            path
            for path in paths
            if not db.execute(
                "SELECT 1 FROM photos WHERE path = ?", (path,)
            ).fetchone()
        ]
    return orphaned


# --------------------------------------------------------------- photos ----

def add_photo(
    album_id: int,
    filename: str,
    path: str,
    uploaded_by: str,
    caption: str = "",
) -> int:
    now = _now()
    with _connect() as db:
        cursor = db.execute(
            """
            INSERT INTO photos (album_id, filename, path, uploaded_by, caption, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (album_id, filename, path, uploaded_by, caption, now),
        )
        db.execute(
            "UPDATE albums SET updated_at = ? WHERE id = ?", (now, album_id)
        )
        return int(cursor.lastrowid)


def list_photos(album_id: int) -> list[dict[str, Any]]:
    with _connect() as db:
        rows = db.execute(
            """
            SELECT id, album_id, filename, path, uploaded_by, caption, created_at
            FROM photos WHERE album_id = ? ORDER BY id DESC
            """,
            (album_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_photo(photo_id: int) -> dict[str, Any] | None:
    with _connect() as db:
        row = db.execute(
            """
            SELECT id, album_id, filename, path, uploaded_by, caption, created_at
            FROM photos WHERE id = ?
            """,
            (photo_id,),
        ).fetchone()
    return dict(row) if row else None


def move_photo(photo_id: int, target_album_id: int) -> None:
    with _connect() as db:
        db.execute(
            "UPDATE photos SET album_id = ? WHERE id = ?",
            (target_album_id, photo_id),
        )


def copy_photo(photo_id: int, target_album_id: int) -> int:
    with _connect() as db:
        row = db.execute(
            "SELECT filename, path, uploaded_by, caption FROM photos WHERE id = ?",
            (photo_id,),
        ).fetchone()
        if not row:
            raise LookupError("photo not found")
        cursor = db.execute(
            """
            INSERT INTO photos (album_id, filename, path, uploaded_by, caption, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (target_album_id, row["filename"], row["path"], row["uploaded_by"], row["caption"], _now()),
        )
        return int(cursor.lastrowid)


def delete_photo(photo_id: int) -> str | None:
    """Deletes the row; returns the file path if no other row references it."""
    with _connect() as db:
        row = db.execute("SELECT path FROM photos WHERE id = ?", (photo_id,)).fetchone()
        if not row:
            return None
        path = row["path"]
        db.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
        still_used = db.execute(
            "SELECT 1 FROM photos WHERE path = ?", (path,)
        ).fetchone()
    return None if still_used else path


# --------------------------------------------------------- mcp connectors --

def _connector_from_row(row) -> dict[str, Any]:
    item = dict(row)
    try:
        item["args"] = json.loads(item.pop("args_json"))
    except (json.JSONDecodeError, TypeError):
        item["args"] = []
    try:
        item["env"] = json.loads(item.pop("env_json"))
    except (json.JSONDecodeError, TypeError):
        item["env"] = {}
    item["enabled"] = bool(item["enabled"])
    item["builtin"] = bool(item["builtin"])
    return item


def list_connectors() -> list[dict[str, Any]]:
    with _connect() as db:
        rows = db.execute(
            """
            SELECT id, name, transport, command, args_json, env_json, url,
                   enabled, builtin, created_at, updated_at
            FROM mcp_connectors ORDER BY builtin DESC, id
            """
        ).fetchall()
    return [_connector_from_row(row) for row in rows]


def create_connector(
    name: str,
    transport: str,
    command: str | None = None,
    args: list[str] | None = None,
    env: dict[str, str] | None = None,
    url: str | None = None,
    enabled: bool = True,
) -> int:
    now = _now()
    with _connect() as db:
        cursor = db.execute(
            """
            INSERT INTO mcp_connectors
                (name, transport, command, args_json, env_json, url,
                 enabled, builtin, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                name.strip()[:80],
                transport,
                command,
                json.dumps(args or []),
                json.dumps(env or {}),
                url,
                int(bool(enabled)),
                now,
                now,
            ),
        )
        return int(cursor.lastrowid)


def update_connector(connector_id: int, **fields: Any) -> None:
    allowed = {"name", "transport", "command", "url", "enabled"}
    sets = []
    params: list[Any] = []
    for key, value in fields.items():
        if key in allowed:
            sets.append(f"{key} = ?")
            params.append(int(value) if key == "enabled" else value)
        elif key == "args":
            sets.append("args_json = ?")
            params.append(json.dumps(value or []))
        elif key == "env":
            sets.append("env_json = ?")
            params.append(json.dumps(value or {}))
    if not sets:
        return
    sets.append("updated_at = ?")
    params.append(_now())
    params.append(connector_id)
    with _connect() as db:
        db.execute(
            f"UPDATE mcp_connectors SET {', '.join(sets)} WHERE id = ?",
            params,
        )


def delete_connector(connector_id: int) -> None:
    with _connect() as db:
        db.execute("DELETE FROM mcp_connectors WHERE id = ?", (connector_id,))
