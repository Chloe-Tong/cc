"""共享的 SQLite 连接管理。

注意：`with sqlite3.connect(path) as conn:` 只提交/回滚事务，**不关闭连接**。
在循环里这样用会持续泄漏文件描述符，达到 ulimit 后抛 OSError(EMFILE)。
本模块的 open_db() 既管事务也管关闭。
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def open_db(db_path: str | Path):
    """打开一条连接：成功提交、异常回滚，无论如何都关闭。"""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()
