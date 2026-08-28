"""
林的 MCP Server — 13 个工具，供 claude -p 在对话中调用。
启动方式: python -m mcp_server.server
"""
import json
import time
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

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
app = Server("lin-memory")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(name="read_memories",        description="按层读取记忆（layer: core/episodic/working）", inputSchema={"type":"object","properties":{"layer":{"type":"string","enum":["core","episodic","working"]},"limit":{"type":"integer","default":20}},"required":["layer"]}),
        Tool(name="search_memories",      description="语义关键词搜索全量记忆事件", inputSchema={"type":"object","properties":{"query":{"type":"string"},"top_k":{"type":"integer","default":5}},"required":["query"]}),
        Tool(name="write_episodic",       description="写入一条 episodic 记忆", inputSchema={"type":"object","properties":{"content":{"type":"string"},"importance":{"type":"integer","default":1,"description":"1-3"},"emotion_tag":{"type":"string"}},"required":["content"]}),
        Tool(name="update_core",          description="更新核心记忆某个类别", inputSchema={"type":"object","properties":{"category":{"type":"string","description":"relationship/preference/belief/personality"},"content":{"type":"string"}},"required":["category","content"]}),
        Tool(name="get_working_context",  description="获取当前窗口工作记忆（最近事件+当前情绪）", inputSchema={"type":"object","properties":{}}),
        Tool(name="set_emotion_state",    description="更新林当前情绪状态", inputSchema={"type":"object","properties":{"primary":{"type":"string"},"intensity":{"type":"number","minimum":0,"maximum":1},"secondary":{"type":"string"},"trigger":{"type":"string"},"drifting_toward":{"type":"string"}},"required":["primary","intensity"]}),
        Tool(name="get_emotion_history",  description="获取情绪历史曲线", inputSchema={"type":"object","properties":{"hours":{"type":"number","default":24}}}),
        Tool(name="save_pending_thought", description="保存一个林想稍后说的想法", inputSchema={"type":"object","properties":{"content":{"type":"string"},"priority":{"type":"integer","default":1,"description":"1-3"}},"required":["content"]}),
        Tool(name="get_pending_thoughts", description="获取所有还没说出口的想法", inputSchema={"type":"object","properties":{}}),
        Tool(name="mark_thought_shared",  description="标记某条待说想法已分享", inputSchema={"type":"object","properties":{"thought_id":{"type":"integer"}},"required":["thought_id"]}),
        Tool(name="note_observation",     description="记录林对用户的一条观察", inputSchema={"type":"object","properties":{"content":{"type":"string"},"category":{"type":"string","enum":["behavior","preference","emotion","relationship","other"],"default":"other"}},"required":["content"]}),
        Tool(name="get_relationship_snapshot", description="获取关系快照：观察+核心记忆+当前情绪", inputSchema={"type":"object","properties":{}}),
        Tool(name="compress_memories",    description="手动触发记忆压缩（通常由系统自动触发）", inputSchema={"type":"object","properties":{"older_than_hours":{"type":"number","default":48}}}),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    result = await _dispatch(name, arguments)
    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


async def _dispatch(name: str, args: dict) -> dict:

    # ── 1. read_memories ────────────────────────────────────────
    if name == "read_memories":
        layer = args["layer"]
        limit = args.get("limit", 20)

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

    # ── 2. search_memories ──────────────────────────────────────
    elif name == "search_memories":
        query = args["query"].lower()
        top_k = args.get("top_k", 5)
        # Simple keyword search over episodic events
        # (可换成 embedding 向量检索)
        all_events = event_log.tail(500)
        scored = []
        terms = query.split()
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

    # ── 3. write_episodic ───────────────────────────────────────
    elif name == "write_episodic":
        head = event_log.head_seq()
        tag = args.get("emotion_tag", "")
        content = args["content"]
        if tag:
            content = f"[{tag}] {content}"
        event = Event(
            seq=0, actor="ai", source="lin",
            scope="private", audience=["*"],
            content=content,
            based_on_seq=head,
        )
        event = event_log.append(event)
        return {"ok": True, "seq": event.seq}

    # ── 4. update_core ──────────────────────────────────────────
    elif name == "update_core":
        # Append a tagged event that will be picked up at next compression
        head = event_log.head_seq()
        event = Event(
            seq=0, actor="ai", source="lin",
            scope="private", audience=["*"],
            content=f"[CORE:{args['category'].upper()}] {args['content']}",
            based_on_seq=head,
        )
        event_log.append(event)
        return {"ok": True, "category": args["category"]}

    # ── 5. get_working_context ──────────────────────────────────
    elif name == "get_working_context":
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

    # ── 6. set_emotion_state ────────────────────────────────────
    elif name == "set_emotion_state":
        state = emotion.set(
            primary=args["primary"],
            intensity=args["intensity"],
            secondary=args.get("secondary"),
            trigger=args.get("trigger"),
            drifting_toward=args.get("drifting_toward"),
        )
        return {"ok": True, "emotion": _emotion_dict(state)}

    # ── 7. get_emotion_history ──────────────────────────────────
    elif name == "get_emotion_history":
        hours = args.get("hours", 24)
        history = emotion.history(hours=hours)
        return {"history": [_emotion_dict(e) for e in history]}

    # ── 8. save_pending_thought ─────────────────────────────────
    elif name == "save_pending_thought":
        t = thoughts.save(args["content"], priority=args.get("priority", 1))
        return {"ok": True, "thought_id": t.id}

    # ── 9. get_pending_thoughts ─────────────────────────────────
    elif name == "get_pending_thoughts":
        pending = thoughts.pending()
        return {"thoughts": [
            {"id": t.id, "content": t.content, "priority": t.priority}
            for t in pending
        ]}

    # ── 10. mark_thought_shared ─────────────────────────────────
    elif name == "mark_thought_shared":
        thoughts.mark_shared(args["thought_id"])
        return {"ok": True}

    # ── 11. note_observation ────────────────────────────────────
    elif name == "note_observation":
        obs = observations.note(args["content"], category=args.get("category", "other"))
        return {"ok": True, "observation_id": obs.id}

    # ── 12. get_relationship_snapshot ───────────────────────────
    elif name == "get_relationship_snapshot":
        cp = cp_store.latest()
        emo = emotion.current()
        obs = observations.recent(limit=10)
        return {
            "core_memory": {
                "constant":  cp.layer_constant if cp else "",
                "portrait":  cp.layer_portrait if cp else "",
            },
            "emotion": _emotion_dict(emo),
            "observations": [{"content": o.content, "category": o.category,
                               "ts": o.created_at} for o in obs],
        }

    # ── 13. compress_memories ───────────────────────────────────
    elif name == "compress_memories":
        # 直接触发 CheckpointWorker.run_once() —— 见 scheduler.py
        from cc.checkpoint import CheckpointWorker
        from companion.runner import make_summarize_fn
        worker = CheckpointWorker(event_log, cp_store, make_summarize_fn())
        cp = worker.run_once()
        if cp:
            return {"ok": True, "checkpoint_id": cp.id,
                    "covered_through_seq": cp.covered_through_seq}
        return {"ok": False, "reason": "no new events to compress"}

    return {"error": f"unknown tool: {name}"}


def _emotion_dict(e) -> dict:
    if e is None:
        return {}
    return {
        "primary": e.primary, "secondary": e.secondary,
        "intensity": e.intensity, "trigger": e.trigger,
        "drifting_toward": e.drifting_toward, "ts": e.created_at,
    }


async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
