from pathlib import Path

from cc.db import open_db


class SettingsStore:
    """键值设置表。目前只存 AI 伴侣的昵称，供 system prompt / MCP server 描述等运行时读取，
    避免把昵称硬编码进源码。"""

    def __init__(self, db_path: str | Path):
        self._db = str(db_path)
        self._init()

    def _conn(self):
        return open_db(self._db)

    def _init(self):
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)

    def get(self, key: str, default: str = "") -> str:
        with self._conn() as c:
            row = c.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default

    def set(self, key: str, value: str) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )

    def get_companion_name(self, default: str = "") -> str:
        return self.get("companion_name", default)

    def set_companion_name(self, name: str) -> None:
        self.set("companion_name", name)
