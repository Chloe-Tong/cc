from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from api.app import event_log, cp_store, emotion, thoughts, inner_thoughts, observations

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


def _emo(e) -> dict:
    if e is None:
        return {}
    return {
        "primary": e.primary, "secondary": e.secondary,
        "intensity": e.intensity, "trigger": e.trigger,
        "drifting_toward": e.drifting_toward, "ts": e.created_at,
    }
