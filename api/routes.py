from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List

from api.app import event_log, cp_store, emotion, thoughts, inner_thoughts, observations
from api.import_parser import detect_and_parse
from cc.models import Event

router = APIRouter()


# ── GET /status ─────────────────────────────────────────────────
@router.get("/status")
def get_status():
    """前端首屏：当前情绪 + 最近记忆摘要 + 待说的话数量。"""
    emo = emotion.current()
    cp  = cp_store.latest()
    pending_count = len(thoughts.pending())
    return {
        "emotion": _emo(emo),
        "memory_summary": {
            "recent":    cp.layer_recent    if cp else "",
            "midground": cp.layer_midground if cp else "",
        },
        "pending_thoughts_count": pending_count,
        "event_count": event_log.head_seq(),
    }


# ── GET /emotion/history ─────────────────────────────────────────
@router.get("/emotion/history")
def get_emotion_history(hours: float = 24):
    history = emotion.history(hours=hours)
    return {"history": [_emo(e) for e in history]}


# ── GET /memories ────────────────────────────────────────────────
@router.get("/memories")
def get_memories(layer: str = "episodic", limit: int = 20):
    if layer == "core":
        cp = cp_store.latest()
        if not cp:
            return {"layer": "core", "data": {}}
        return {"layer": "core", "data": {
            "constant":  cp.layer_constant,
            "portrait":  cp.layer_portrait,
            "midground": cp.layer_midground,
            "recent":    cp.layer_recent,
        }}
    elif layer == "episodic":
        events = event_log.tail(limit)
        return {"layer": "episodic", "events": [
            {"seq": e.seq, "actor": e.actor, "content": e.content, "ts": e.created_at}
            for e in events
        ]}
    else:
        raise HTTPException(400, "layer must be core or episodic")


# ── GET /thoughts ────────────────────────────────────────────────
# 返回林打算说给用户的话（待说消息队列，未说出口的）
@router.get("/thoughts")
def get_thoughts():
    return {"thoughts": [
        {"id": t.id, "content": t.content, "priority": t.priority}
        for t in thoughts.pending()
    ]}


# ── GET /thoughts/inner ──────────────────────────────────────────
# 返回林的内心独白（自言自语，非对话）
# visibility: "public"（展示）| "private"（仅计数，内容不返回）| 不传则两种都返
@router.get("/thoughts/inner")
def get_inner_thoughts(limit: int = 20):
    counts = inner_thoughts.count_by_visibility()
    public_items = inner_thoughts.recent(limit=limit, visibility="public")
    return {
        "public": [
            {"id": t.id, "content": t.content, "ts": t.created_at}
            for t in public_items
        ],
        "private_count": counts.get("private", 0),
    }


# ── GET /observations ────────────────────────────────────────────
@router.get("/observations")
def get_observations(category: Optional[str] = None, limit: int = 20):
    obs = observations.recent(limit=limit, category=category)
    return {"observations": [
        {"id": o.id, "content": o.content, "category": o.category, "ts": o.created_at}
        for o in obs
    ]}


# ── DELETE /memories ─────────────────────────────────────────────
class DeleteRequest(BaseModel):
    seqs: List[int]

@router.delete("/memories")
def delete_memories(req: DeleteRequest):
    """删除指定 seq 的事件（需前端传入勾选的 seq 列表）。"""
    if not req.seqs:
        raise HTTPException(400, "seqs list is empty")
    deleted = event_log.delete_by_seqs(req.seqs)
    return {"ok": True, "deleted": deleted}


# ── DELETE /reset ────────────────────────────────────────────────
@router.delete("/reset")
def reset_all():
    """清空全部数据（events / checkpoints / emotions / thoughts / observations）。"""
    import sqlite3 as _sq
    with _sq.connect(event_log._db_path) as conn:
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM checkpoints")
        conn.execute("DELETE FROM emotions")
        conn.execute("DELETE FROM pending_thoughts")
        conn.execute("DELETE FROM inner_thoughts")
        conn.execute("DELETE FROM observations")
    return {"ok": True}


# ── POST /compress ───────────────────────────────────────────────
@router.post("/compress")
def trigger_compression():
    """手动触发记忆压缩（调试用）。"""
    from cc.checkpoint import CheckpointWorker
    from companion.runner import make_summarize_fn
    worker = CheckpointWorker(event_log, cp_store, make_summarize_fn(),
                              every_n_events=1, every_seconds=0)
    cp = worker.run_once()
    if cp:
        return {"ok": True, "checkpoint_id": cp.id}
    return {"ok": False, "reason": "nothing new to compress"}


# ── POST /import/conversations ───────────────────────────────────
@router.post("/import/conversations")
async def import_conversations(file: UploadFile = File(...)):
    """上传 Claude 或 ChatGPT 导出（.json 或 .zip），写入事件日志。"""
    import zipfile, io
    fname = (file.filename or "").lower()
    raw_bytes = await file.read()

    if fname.endswith(".zip"):
        try:
            zf = zipfile.ZipFile(io.BytesIO(raw_bytes))
        except zipfile.BadZipFile:
            raise HTTPException(400, "无法解析 zip 文件")
        candidates = [n for n in zf.namelist()
                      if n.endswith("conversations.json") and not n.startswith("__MACOSX")]
        if not candidates:
            raise HTTPException(400, "zip 中未找到 conversations.json")
        raw = zf.read(candidates[0])
    elif fname.endswith(".json"):
        raw = raw_bytes
    else:
        raise HTTPException(400, "请上传 .json 或 .zip 文件")
    try:
        events, fmt = detect_and_parse(raw)
    except ValueError as e:
        raise HTTPException(400, str(e))

    import sqlite3 as _sqlite3, time as _time

    head = event_log.head_seq()
    imported = 0
    skipped = 0
    earliest_ts = None

    # 预加载已有事件的 (actor, content, created_at) 用于去重
    def _is_duplicate(actor: str, content: str, ts: float) -> bool:
        with _sqlite3.connect(event_log._db_path) as conn:
            row = conn.execute(
                """SELECT 1 FROM events
                   WHERE actor=? AND content=? AND ABS(created_at - ?) < 60
                   LIMIT 1""",
                (actor, content, ts),
            ).fetchone()
        return row is not None

    for ev in events:
        ts = ev["ts"] if ev["ts"] > 0 else _time.time()
        if _is_duplicate(ev["actor"], ev["content"], ts):
            skipped += 1
            continue
        e = Event(
            seq=0,
            actor=ev["actor"],
            source="import",
            scope="private",
            audience=["*"],
            content=ev["content"],
            based_on_seq=head,
            created_at=ts,
        )
        event_log.append(e)
        imported += 1
        if earliest_ts is None or ts < earliest_ts:
            earliest_ts = ts

    # 检测冲突：导入数据是否早于已压缩记忆
    stale_compression = False
    cp = cp_store.latest()
    if cp and earliest_ts is not None and imported > 0:
        # 找到压缩覆盖截止的事件时间戳
        compressed_events = event_log.range(0, cp.covered_through_seq)
        if compressed_events:
            compressed_cutoff_ts = compressed_events[-1].created_at
            if earliest_ts < compressed_cutoff_ts:
                stale_compression = True

    return {
        "ok": True,
        "format": fmt,
        "imported": imported,
        "skipped": skipped,
        "stale_compression": stale_compression,
    }


def _emo(e) -> dict:
    if e is None:
        return {}
    return {
        "primary": e.primary, "secondary": e.secondary,
        "intensity": e.intensity, "trigger": e.trigger,
        "drifting_toward": e.drifting_toward, "ts": e.created_at,
    }
