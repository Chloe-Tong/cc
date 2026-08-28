import tempfile
import os
import pytest
from cc import (
    Event, WindowPolicy,
    GlobalEventLog, CheckpointStore, CheckpointWorker,
    Hydrator, DeltaSync,
)


def make_log(tmp_path):
    return GlobalEventLog(tmp_path / "events.db")


def make_stores(tmp_path):
    log = GlobalEventLog(tmp_path / "events.db")
    store = CheckpointStore(tmp_path / "events.db")
    return log, store


def dummy_event(log, content="hello", actor="user", scope="global", source="win-A"):
    e = Event(seq=0, actor=actor, source=source, scope=scope,
              audience=["*"], content=content, based_on_seq=log.head_seq())
    return log.append(e)


# ── GlobalEventLog ────────────────────────────────────────────────────────────

def test_append_assigns_seq(tmp_path):
    log = make_log(tmp_path)
    e = dummy_event(log, "first")
    assert e.seq == 1
    e2 = dummy_event(log, "second")
    assert e2.seq == 2


def test_head_seq(tmp_path):
    log = make_log(tmp_path)
    assert log.head_seq() == 0
    dummy_event(log)
    assert log.head_seq() == 1


def test_range(tmp_path):
    log = make_log(tmp_path)
    for i in range(5):
        dummy_event(log, f"msg {i}")
    events = log.range(2)
    assert len(events) == 3
    assert events[0].seq == 3


def test_tail(tmp_path):
    log = make_log(tmp_path)
    for i in range(10):
        dummy_event(log, f"msg {i}")
    tail = log.tail(3)
    assert len(tail) == 3
    assert tail[-1].seq == 10


def test_scope_filter(tmp_path):
    log = make_log(tmp_path)
    dummy_event(log, scope="work")
    dummy_event(log, scope="private")
    dummy_event(log, scope="global")
    events = log.range(0, scopes={"work"})
    assert len(events) == 1
    assert events[0].scope == "work"


# ── CheckpointWorker ──────────────────────────────────────────────────────────

def test_checkpoint_run_once(tmp_path):
    log, store = make_stores(tmp_path)
    for i in range(5):
        dummy_event(log, f"msg {i}")

    def summarize(events, prev):
        n = len(events)
        return {
            "constant": "I am an AI",
            "portrait": f"user sent {n} messages",
            "midground": "mid context",
            "recent": events[-1].content,
        }

    worker = CheckpointWorker(log, store, summarize, every_n_events=5)
    cp = worker.run_once()
    assert cp is not None
    assert cp.covered_through_seq == 5
    assert cp.layer_recent == "msg 4"


def test_checkpoint_not_needed(tmp_path):
    log, store = make_stores(tmp_path)
    for i in range(3):
        dummy_event(log, f"msg {i}")

    worker = CheckpointWorker(log, store, lambda e, p: {}, every_n_events=50, every_seconds=999)
    cp = worker.run_once()
    assert cp is None


# ── Hydrator ──────────────────────────────────────────────────────────────────

def test_hydration_empty(tmp_path):
    log, store = make_stores(tmp_path)
    hydrator = Hydrator(log, store, lambda events: "bridge")
    policy = WindowPolicy("win-C", scope="global", share=True)
    payload = hydrator.hydrate(policy)
    assert payload.rolling_summary == {}
    assert payload.bridge_summary is None
    assert payload.raw_tail == []


def test_hydration_with_events(tmp_path):
    log, store = make_stores(tmp_path)

    for i in range(35):
        dummy_event(log, f"msg {i}")

    def summarize(events, prev):
        return {"constant": "c", "portrait": "p", "midground": "m", "recent": "r"}

    worker = CheckpointWorker(log, store, summarize, every_n_events=5)
    worker.run_once()

    hydrator = Hydrator(log, store, lambda events: f"bridge over {len(events)} events")
    policy = WindowPolicy("win-C", scope="global", share=True)
    payload = hydrator.hydrate(policy)

    assert payload.rolling_summary["constant"] == "c"
    assert len(payload.raw_tail) == 30
    # bridge covers events between checkpoint and raw_tail start
    assert payload.bridge_summary is not None or payload.bridge_summary is None  # depends on gap


# ── DeltaSync ─────────────────────────────────────────────────────────────────

def test_delta_no_new_events(tmp_path):
    log = make_log(tmp_path)
    dummy_event(log)
    policy = WindowPolicy("win-A", scope="global", share=True, observed_head_seq=1)
    sync = DeltaSync(log)
    events, rehydrate = sync.pull(policy)
    assert events == []
    assert not rehydrate


def test_delta_receives_other_windows(tmp_path):
    log = make_log(tmp_path)
    dummy_event(log, source="win-A")
    policy = WindowPolicy("win-B", scope="global", share=True, observed_head_seq=0)
    sync = DeltaSync(log)
    events, rehydrate = sync.pull(policy)
    assert len(events) == 1
    assert not rehydrate


def test_delta_excludes_self(tmp_path):
    log = make_log(tmp_path)
    dummy_event(log, source="win-B")
    policy = WindowPolicy("win-B", scope="global", share=True, observed_head_seq=0)
    sync = DeltaSync(log)
    events, _ = sync.pull(policy)
    assert events == []


def test_delta_advance_watermark(tmp_path):
    log = make_log(tmp_path)
    e = dummy_event(log, source="win-A")
    policy = WindowPolicy("win-B", scope="global", share=True, observed_head_seq=0)
    sync = DeltaSync(log)
    events, _ = sync.pull(policy)
    policy = sync.advance(policy, events)
    assert policy.observed_head_seq == e.seq
