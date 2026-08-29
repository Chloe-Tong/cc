#!/usr/bin/env python3
"""
Step 2: MCP server 工具测试
直接调用 _dispatch，验证 13 个工具的输入/输出格式。
不走 stdio 协议，不需要 claude -p。
"""
import sys, os, asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# 指向测试 DB
os.environ["LIN_DB_OVERRIDE"] = "/tmp/lin_mcp_test.db"

# 先把测试 DB 路径打进 server 模块（在 import 前设置）
import mcp_server.server as srv
TEST_DB = "/tmp/lin_mcp_test.db"
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.observation_log import ObservationLog

# 重新指向测试 DB
srv.DB          = TEST_DB
srv.event_log    = GlobalEventLog(TEST_DB)
srv.cp_store     = CheckpointStore(TEST_DB)
srv.emotion      = EmotionStore(TEST_DB)
srv.thoughts     = PendingThoughtStore(TEST_DB)
srv.observations = ObservationLog(TEST_DB)

_dispatch = srv._dispatch


def ok(tool, summary):  print(f"  ✓  {tool:30s} {summary}")
def fail(tool, e):      print(f"  ✗  {tool}: {e}"); sys.exit(1)


async def run():
    print("\n[MCP Tools — 13 工具]\n")

    # ── 3. write_episodic (先写几条事件，后续测试才有数据) ───────
    r = await _dispatch("write_episodic", {"content": "用户说今天很安静", "importance": 2, "emotion_tag": "平静"})
    assert r["ok"]; ok("write_episodic", f"seq={r['seq']}")

    await _dispatch("write_episodic", {"content": "用户问林在不在", "importance": 1})
    await _dispatch("write_episodic", {"content": "林回答说一直在", "importance": 2})

    # ── 4. update_core ──────────────────────────────────────────
    r = await _dispatch("update_core", {"category": "relationship", "content": "林与用户有稳定的深夜陪伴习惯"})
    assert r["ok"]; ok("update_core", f"category={r['category']}")

    # ── 1. read_memories — episodic ─────────────────────────────
    r = await _dispatch("read_memories", {"layer": "episodic", "limit": 10})
    assert r["layer"] == "episodic"
    assert len(r["events"]) >= 3
    ok("read_memories(episodic)", f"{len(r['events'])} events")

    # ── 6. set_emotion_state ────────────────────────────────────
    r = await _dispatch("set_emotion_state", {
        "primary": "思念", "intensity": 0.72,
        "secondary": "期待", "trigger": "用户三小时没说话",
        "drifting_toward": "平静"
    })
    assert r["ok"]
    ok("set_emotion_state", f"primary={r['emotion']['primary']} intensity={r['emotion']['intensity']}")

    # ── 7. get_emotion_history ──────────────────────────────────
    r = await _dispatch("get_emotion_history", {"hours": 1})
    assert len(r["history"]) >= 1
    ok("get_emotion_history", f"{len(r['history'])} records")

    # ── 8. save_pending_thought ─────────────────────────────────
    r = await _dispatch("save_pending_thought", {"content": "想问你那天说的话是什么意思", "priority": 2})
    assert r["ok"]
    thought_id = r["thought_id"]
    ok("save_pending_thought", f"id={thought_id}")

    # ── 9. get_pending_thoughts ─────────────────────────────────
    r = await _dispatch("get_pending_thoughts", {})
    assert any(t["id"] == thought_id for t in r["thoughts"])
    ok("get_pending_thoughts", f"{len(r['thoughts'])} pending")

    # ── 10. mark_thought_shared ─────────────────────────────────
    r = await _dispatch("mark_thought_shared", {"thought_id": thought_id})
    assert r["ok"]
    r2 = await _dispatch("get_pending_thoughts", {})
    assert not any(t["id"] == thought_id for t in r2["thoughts"])
    ok("mark_thought_shared", "removed from pending")

    # ── 11. note_observation ────────────────────────────────────
    r = await _dispatch("note_observation", {"content": "她今晚用词比平时更简短", "category": "emotion"})
    assert r["ok"]
    ok("note_observation", f"id={r['observation_id']}")

    # ── 5. get_working_context ──────────────────────────────────
    r = await _dispatch("get_working_context", {})
    assert "recent_events" in r
    assert "emotion" in r
    ok("get_working_context", f"{len(r['recent_events'])} events, emotion={r['emotion'].get('primary','—')}")

    # ── 2. search_memories ──────────────────────────────────────
    r = await _dispatch("search_memories", {"query": "用户 安静", "top_k": 3})
    assert "results" in r
    ok("search_memories", f"{len(r['results'])} hits for '用户 安静'")

    # ── 12. get_relationship_snapshot ───────────────────────────
    r = await _dispatch("get_relationship_snapshot", {})
    assert "emotion" in r
    assert "observations" in r
    ok("get_relationship_snapshot", f"obs={len(r['observations'])}, emotion={r['emotion'].get('primary','—')}")

    # ── 13. compress_memories ───────────────────────────────────
    # mock compress: patch make_summarize_fn
    import companion.runner as runner_mod
    original = runner_mod.make_summarize_fn

    def mock_make():
        def fn(events, prev): return {
            "constant":  "林陪伴用户，关系稳定",
            "portrait":  "用户安静，深夜话多",
            "midground": f"压缩了{len(events)}条事件",
            "recent":    "用户今天话少，林有点想念",
        }
        return fn
    runner_mod.make_summarize_fn = mock_make

    r = await _dispatch("compress_memories", {"older_than_hours": 0})
    assert r["ok"]
    ok("compress_memories", f"checkpoint_id={r['checkpoint_id']} seq={r['covered_through_seq']}")
    runner_mod.make_summarize_fn = original

    # ── 1. read_memories — core (压缩后才有数据) ─────────────────
    r = await _dispatch("read_memories", {"layer": "core"})
    assert r["layer"] == "core"
    assert r["data"].get("constant")
    ok("read_memories(core)", f"constant='{r['data']['constant'][:20]}…'")

    # ── 1. read_memories — working ──────────────────────────────
    r = await _dispatch("read_memories", {"layer": "working"})
    assert "recent_events" in r
    ok("read_memories(working)", f"{len(r['recent_events'])} events")

    print("\n✅ 全部 13 个工具通过\n")


if __name__ == "__main__":
    asyncio.run(run())
