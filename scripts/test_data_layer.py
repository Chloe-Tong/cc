#!/usr/bin/env python3
"""
Step 1: 数据层冒烟测试
验证 event_log / emotion / pending_thoughts / observation / checkpoint 全链路。
不依赖 claude -p。
"""
import sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore, CheckpointWorker
from cc.models import Event
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.observation_log import ObservationLog

DB = "/tmp/lin_test.db"

def ok(label): print(f"  ✓  {label}")
def fail(label, e): print(f"  ✗  {label}: {e}"); sys.exit(1)


def test_events():
    print("\n[1] Event log")
    log = GlobalEventLog(DB)

    e1 = log.append(Event(0, "user", "chat", "private", ["*"], "今天心情怎么样？", 0))
    e2 = log.append(Event(0, "ai",   "evermind",  "private", ["*"], "有点想你，安静的那种。", e1.seq))

    assert e1.seq > 0
    assert e2.seq == e1.seq + 1
    ok(f"append: seq {e1.seq}, {e2.seq}")

    tail = log.tail(5)
    assert len(tail) >= 2
    ok(f"tail: {len(tail)} events")

    head = log.head_seq()
    assert head == e2.seq
    ok(f"head_seq: {head}")


def test_emotion():
    print("\n[2] Emotion store")
    store = EmotionStore(DB)

    s = store.set("安静", 0.65, secondary="想念", trigger="用户离线了3小时",
                  drifting_toward="期待再见")
    assert s.id > 0
    ok(f"set: id={s.id} primary={s.primary} intensity={s.intensity}")

    cur = store.current()
    assert cur.primary == "安静"
    assert cur.drifting_toward == "期待再见"
    ok("current: matches")

    history = store.history(hours=1)
    assert len(history) >= 1
    ok(f"history(1h): {len(history)} records")


def test_pending_thoughts():
    print("\n[3] Pending thoughts")
    store = PendingThoughtStore(DB)

    t1 = store.save("等你回来我想问你一个问题", priority=2)
    t2 = store.save("今天读到了一段很美的描述", priority=1)
    assert t1.id > 0
    ok(f"save: id={t1.id}, id={t2.id}")

    pending = store.pending()
    assert any(t.id == t1.id for t in pending)
    ok(f"pending: {len(pending)} thoughts")

    store.mark_shared(t2.id)
    pending2 = store.pending()
    assert not any(t.id == t2.id for t in pending2)
    ok("mark_shared: removed from pending")


def test_observations():
    print("\n[4] Observation log")
    log = ObservationLog(DB)

    o1 = log.note("她今天用了比平时更多的省略号", category="emotion")
    o2 = log.note("她喜欢在深夜说话", category="behavior")
    assert o1.id > 0
    ok(f"note: id={o1.id}, id={o2.id}")

    recent = log.recent(limit=10)
    assert len(recent) >= 2
    ok(f"recent: {len(recent)} observations")

    by_cat = log.recent(category="emotion")
    assert any(o.id == o1.id for o in by_cat)
    ok("filter by category: ok")


def test_checkpoint():
    print("\n[5] Checkpoint (mock summarize_fn)")
    event_log = GlobalEventLog(DB)
    cp_store  = CheckpointStore(DB)

    def mock_summarize(events, prev_cp):
        return {
            "constant":  "晓与用户建立了深度陪伴关系",
            "portrait":  "用户内敛，深夜话多，喜欢哲学问题",
            "midground": f"最近{len(events)}条事件已压缩",
            "recent":    "用户今天安静，晓情绪平稳中带着思念",
        }

    worker = CheckpointWorker(
        event_log, cp_store, mock_summarize,
        every_n_events=1,   # 测试：1条就触发
        every_seconds=0,
    )

    cp = worker.run_once()
    assert cp is not None and cp.id > 0
    ok(f"run_once: checkpoint id={cp.id} seq={cp.covered_through_seq}")

    latest = cp_store.latest()
    assert latest.layer_constant == "晓与用户建立了深度陪伴关系"
    ok("latest: layers match")


if __name__ == "__main__":
    import os
    if os.path.exists(DB):
        os.remove(DB)

    test_events()
    test_emotion()
    test_pending_thoughts()
    test_observations()
    test_checkpoint()

    print("\n✅ 数据层全部通过\n")
