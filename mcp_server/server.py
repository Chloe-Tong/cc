"""
林的 MCP Server — 13 个工具，供 claude -p 在对话中调用。
启动方式: python -m mcp_server.server
MCP SDK >= 2.x (MCPServer)
"""
import json
from pathlib import Path
from typing import Optional

from mcp.server.mcpserver import MCPServer

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from cc.models import Event
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.observation_log import ObservationLog

# ── 数据路径 ────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

DB = str(DATA_DIR / "lin.db")

event_log    = GlobalEventLog(DB)
cp_store     = CheckpointStore(DB)
emotion      = EmotionStore(DB)
thoughts     = PendingThoughtStore(DB)
observations = ObservationLog(DB)

# ── Server ──────────────────────────────────────────────────────
app = MCPServer("lin-memory", description="林的记忆与情绪系统")


def _emotion_dict(e) -> dict:
    if e is None:
        return {}
    return {
        "primary": e.primary, "secondary": e.secondary,
        "intensity": e.intensity, "trigger": e.trigger,
        "drifting_toward": e.drifting_toward, "ts": e.created_at,
    }


# ── 1. read_memories ─────────────────────────────────────────────
@app.tool(description="按层读取记忆（layer: core/episodic/working）")
def read_memories(layer: str, limit: int = 20) -> dict:
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
            {"seq": e.seq, "actor": e.actor, "content": e.content,
             "created_at": e.created_at}
            for e in events
        ]}

    elif layer == "working":
        events = event_log.tail(10)
        emo = emotion.current()
        pending = thoughts.pending()
        return {
            "layer": "working",
            "recent_events": [{"actor": e.actor, "content": e.content} for e in events],
            "emotion": _emotion_dict(emo),
            "pending_thoughts": [{"id": t.id, "content": t.content} for t in pending],
        }

    return {"error": f"unknown layer: {layer}"}


# ── 2. search_memories ───────────────────────────────────────────
@app.tool(description="语义关键词搜索全量记忆事件")
def search_memories(query: str, top_k: int = 5) -> dict:
    q = query.lower()
    all_events = event_log.tail(500)
    scored = []
    terms = q.split()
    for e in all_events:
        score = sum(t in e.content.lower() for t in terms)
        if score > 0:
            scored.append((score, e))
    scored.sort(key=lambda x: -x[0])
    return {"results": [
        {"seq": e.seq, "actor": e.actor, "content": e.content,
         "relevance": s, "created_at": e.created_at}
        for s, e in scored[:top_k]
    ]}


# ── 3. write_episodic ────────────────────────────────────────────
@app.tool(description="写入一条 episodic 记忆")
def write_episodic(content: str, importance: int = 1,
                   emotion_tag: Optional[str] = None) -> dict:
    head = event_log.head_seq()
    text = f"[{emotion_tag}] {content}" if emotion_tag else content
    event = Event(
        seq=0, actor="ai", source="lin",
        scope="private", audience=["*"],
        content=text, based_on_seq=head,
    )
    event = event_log.append(event)
    return {"ok": True, "seq": event.seq}


# ── 4. update_core ───────────────────────────────────────────────
@app.tool(description="更新核心记忆某个类别（relationship/preference/belief/personality）")
def update_core(category: str, content: str) -> dict:
    head = event_log.head_seq()
    event = Event(
        seq=0, actor="ai", source="lin",
        scope="private", audience=["*"],
        content=f"[CORE:{category.upper()}] {content}",
        based_on_seq=head,
    )
    event_log.append(event)
    return {"ok": True, "category": category}


# ── 5. get_working_context ───────────────────────────────────────
@app.tool(description="获取当前窗口工作记忆（最近事件+当前情绪+观察）")
def get_working_context() -> dict:
    events = event_log.tail(15)
    emo = emotion.current()
    pending = thoughts.pending()
    obs = observations.recent(limit=5)
    return {
        "recent_events": [{"actor": e.actor, "content": e.content,
                            "ts": e.created_at} for e in events],
        "emotion": _emotion_dict(emo),
        "pending_thoughts": [{"id": t.id, "content": t.content,
                               "priority": t.priority} for t in pending],
        "recent_observations": [{"content": o.content,
                                  "category": o.category} for o in obs],
    }


# ── 6. set_emotion_state ─────────────────────────────────────────
@app.tool(description="更新林当前情绪状态")
def set_emotion_state(primary: str, intensity: float,
                      secondary: Optional[str] = None,
                      trigger: Optional[str] = None,
                      drifting_toward: Optional[str] = None) -> dict:
    state = emotion.set(
        primary=primary, intensity=intensity,
        secondary=secondary, trigger=trigger,
        drifting_toward=drifting_toward,
    )
    return {"ok": True, "emotion": _emotion_dict(state)}


# ── 7. get_emotion_history ───────────────────────────────────────
@app.tool(description="获取情绪历史曲线")
def get_emotion_history(hours: float = 24) -> dict:
    history = emotion.history(hours=hours)
    return {"history": [_emotion_dict(e) for e in history]}


# ── 8. save_pending_thought ──────────────────────────────────────
@app.tool(description="保存一个林想稍后说的想法")
def save_pending_thought(content: str, priority: int = 1) -> dict:
    t = thoughts.save(content, priority=priority)
    return {"ok": True, "thought_id": t.id}


# ── 9. get_pending_thoughts ──────────────────────────────────────
@app.tool(description="获取所有还没说出口的想法")
def get_pending_thoughts() -> dict:
    pending = thoughts.pending()
    return {"thoughts": [
        {"id": t.id, "content": t.content, "priority": t.priority}
        for t in pending
    ]}


# ── 10. mark_thought_shared ──────────────────────────────────────
@app.tool(description="标记某条待说想法已分享")
def mark_thought_shared(thought_id: int) -> dict:
    thoughts.mark_shared(thought_id)
    return {"ok": True}


# ── 11. note_observation ─────────────────────────────────────────
@app.tool(description="记录林对用户的一条观察")
def note_observation(content: str,
                     category: str = "other") -> dict:
    obs = observations.note(content, category=category)
    return {"ok": True, "observation_id": obs.id}


# ── 12. get_relationship_snapshot ────────────────────────────────
@app.tool(description="获取关系快照：核心记忆+当前情绪+观察")
def get_relationship_snapshot() -> dict:
    cp = cp_store.latest()
    emo = emotion.current()
    obs = observations.recent(limit=10)
    return {
        "core_memory": {
            "constant": cp.layer_constant if cp else "",
            "portrait": cp.layer_portrait if cp else "",
        },
        "emotion": _emotion_dict(emo),
        "observations": [{"content": o.content, "category": o.category,
                           "ts": o.created_at} for o in obs],
    }


# ── 13. compress_memories ────────────────────────────────────────
@app.tool(description="手动触发记忆压缩（通常由系统自动触发）")
def compress_memories(older_than_hours: float = 48) -> dict:
    from cc.checkpoint import CheckpointWorker
    from companion.runner import make_summarize_fn
    worker = CheckpointWorker(event_log, cp_store, make_summarize_fn(),
                              every_n_events=1, every_seconds=0)
    cp = worker.run_once()
    if cp:
        return {"ok": True, "checkpoint_id": cp.id,
                "covered_through_seq": cp.covered_through_seq}
    return {"ok": False, "reason": "no new events to compress"}


# ── 直接调用入口（测试用）───────────────────────────────────────
_TOOL_MAP = {
    "read_memories":          read_memories,
    "search_memories":        search_memories,
    "write_episodic":         write_episodic,
    "update_core":            update_core,
    "get_working_context":    get_working_context,
    "set_emotion_state":      set_emotion_state,
    "get_emotion_history":    get_emotion_history,
    "save_pending_thought":   save_pending_thought,
    "get_pending_thoughts":   get_pending_thoughts,
    "mark_thought_shared":    mark_thought_shared,
    "note_observation":       note_observation,
    "get_relationship_snapshot": get_relationship_snapshot,
    "compress_memories":      compress_memories,
}


async def _dispatch(name: str, args: dict) -> dict:
    fn = _TOOL_MAP.get(name)
    if fn is None:
        return {"error": f"unknown tool: {name}"}
    return fn(**args)


if __name__ == "__main__":
    import asyncio
    asyncio.run(app.run_stdio_async())
