#!/usr/bin/env python3
"""把 evermind 数据库备份到一个独立的【私有】git 仓库。

设计取舍：
  - 用 sqlite3 的在线备份 API 取快照，而不是复制文件。服务运行时直接 cp
    可能拷到写了一半的状态。
  - 存成 .sql 文本而不是 .db 二进制。git 对文本做增量压缩，每天一次提交只增加
    改动部分；二进制每次都整份重存，仓库会迅速膨胀。
  - 快照损坏、或事件表为空（疑似被清空）时中止，绝不用坏数据覆盖上一次的好备份。
  - 内容没变就不提交，避免刷屏式的空提交。

只依赖 Python 标准库和 git，不需要 sqlite3 命令行工具。
"""
from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path

DB       = Path(os.environ.get("EVERMIND_DB", "/root/cc/data/evermind.db"))
REPO     = Path(os.environ.get("BACKUP_REPO_DIR", "/root/evermind-backup"))
BRANCH   = os.environ.get("BACKUP_BRANCH", "main")
MAX_MB   = int(os.environ.get("BACKUP_MAX_MB", "90"))   # GitHub 单文件硬上限 100MB

TABLES = ["events", "checkpoints", "emotion_states",
          "inner_thoughts", "pending_thoughts", "observations"]


def log(msg: str) -> None:
    print(f"[{time.strftime('%FT%TZ', time.gmtime())}] {msg}", flush=True)


def die(msg: str) -> "NoReturn":  # type: ignore[valid-type]
    log(msg)
    sys.exit(1)


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(REPO), *args],
                          capture_output=True, text=True, check=check)


def snapshot(dest: Path) -> sqlite3.Connection:
    """在线备份：服务正在写入也能拿到一致的快照。"""
    src = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    dst = sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close()
    return dst


def main() -> None:
    if not DB.is_file():
        die(f"找不到数据库：{DB}")
    if not (REPO / ".git").is_dir():
        die(f"备份仓库不存在：{REPO}（请先完成一次性设置，见 docs/backup.md）")

    tmp = Path(tempfile.mkdtemp())
    try:
        snap_path = tmp / "snap.db"
        conn = snapshot(snap_path)

        # 完整性校验：坏了就保留上一次的好备份
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            die("快照未通过完整性校验，中止（保留上一次备份）")

        counts = {}
        for t in TABLES:
            try:
                counts[t] = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            except sqlite3.Error:
                counts[t] = None

        if not counts.get("events"):
            die("快照里 events 表为空，中止（疑似数据库被清空，不覆盖已有备份）")

        # 导成 SQL 文本
        sql_path = tmp / "evermind.sql"
        with sql_path.open("w", encoding="utf-8") as f:
            for line in conn.iterdump():
                f.write(line + "\n")
        conn.close()

        mb = sql_path.stat().st_size / 1048576
        if mb > MAX_MB:
            die(f"导出 {mb:.0f}MB，超过 {MAX_MB}MB 上限，中止。"
                "数据已大到不适合放 git，请改用对象存储。")

        # 先只放数据文件，据此判断有没有变化。README 带时间戳，每次都不同，
        # 如果一并参与判断就会天天产生一个内容为空的提交。
        shutil.copy2(sql_path, REPO / "evermind.sql")
        git("add", "evermind.sql")
        if git("diff", "--cached", "--quiet", "--", "evermind.sql",
               check=False).returncode == 0:
            log(f"内容无变化，跳过提交（events={counts['events']}）")
            return

        rows = "\n".join(f"| {t} | {counts[t] if counts[t] is not None else '-'} |"
                         for t in TABLES)
        (tmp / "README.md").write_text(
            f"""# evermind 备份

最后更新：{time.strftime('%F %T', time.gmtime())} UTC

| 表 | 行数 |
|---|---|
{rows}

导出文件：`evermind.sql`（{mb:.1f}MB）

## 恢复方法

```bash
sqlite3 restored.db < evermind.sql     # 或：python3 -c "import sqlite3,sys;sqlite3.connect('restored.db').executescript(open('evermind.sql').read())"
systemctl stop evermind
cp restored.db /root/cc/data/evermind.db
systemctl start evermind
```
""", encoding="utf-8")

        shutil.copy2(tmp / "README.md", REPO / "README.md")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    git("add", "-A")
    git("commit", "-q", "-m",
        f"备份 {time.strftime('%F %T', time.gmtime())} UTC · {counts['events']} 条事件")

    for i in range(1, 5):
        if git("push", "-q", "origin", BRANCH, check=False).returncode == 0:
            log(f"备份完成：{counts['events']} 条事件，{mb:.1f}MB")
            return
        log(f"推送失败，{i * 10} 秒后重试…")
        time.sleep(i * 10)

    die(f"推送反复失败，提交已保存在本地 {REPO}，下次运行会一并推送")


if __name__ == "__main__":
    main()
