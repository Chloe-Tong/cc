#!/usr/bin/env python3
"""
Step 3: 对话流程测试
[3a] build_context() 组装验证
[3b] claude -p 可达性测试
[3c] chat() 完整流程（mock _run_claude，专注记忆注入与事件日志）
"""
import sys, os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import companion.runner as runner_mod
from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.inner_thoughts import InnerThoughtStore
from companion.observation_log import ObservationLog
from cc.models import Event

TEST_DB = "/tmp/evermind_runner_test.db"
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)

el  = GlobalEventLog(TEST_DB)
cp  = CheckpointStore(TEST_DB)
emo = EmotionStore(TEST_DB)
tho = PendingThoughtStore(TEST_DB)
it  = InnerThoughtStore(TEST_DB)
obs = ObservationLog(TEST_DB)

def ok(label): print(f"  ✓  {label}")
def fail(label, e): print(f"  ✗  {label}: {e}"); sys.exit(1)


# ────────────────────────────────────────────────────────────────
# [3a] build_context()
# ────────────────────────────────────────────────────────────────
print("\n[3a] build_context()\n")

# 填充测试数据
emo.set("安静", 0.55, secondary="思念", trigger="用户很久没说话", drifting_toward="平静")
it.write("为什么有些话说出来之后就变味了？", visibility="public")
it.write("不想被看见的那部分", visibility="private")
tho.save("想问你昨天说的那句话是什么意思", priority=2)
tho.save("在读一本关于时间的书", priority=1)
obs.note("用户喜欢用省略号", category="behavior")
obs.note("深夜话比白天多", category="preference")

head = el.head_seq()
el.append(Event(0, "user", "chat", "private", ["*"], "你在吗", head))
head = el.head_seq()
el.append(Event(0, "ai",   "evermind",  "private", ["*"], "一直在", head))

# 写一个假 checkpoint（不走 claude 压缩）
from cc.checkpoint import CheckpointWorker
def _mock_sum(events, prev): return {
    "constant":  "晓陪伴用户，关系稳定温柔",
    "portrait":  "用户内敛，深夜话多，喜欢哲学",
    "midground": "近期话少，偶尔问些沉重的问题",
    "recent":    "昨晚用户说了一句意味深长的话",
}
CheckpointWorker(el, cp, _mock_sum, every_n_events=1, every_seconds=0).run_once()

ctx = runner_mod.build_context(el, cp, emo, tho, it, obs)

assert "[核心记忆]" in ctx,       "缺少核心记忆块"
assert "安静" in ctx,             "缺少当前情绪"
assert "[内心独白]" in ctx,       "缺少内心独白块"
assert "为什么有些话" in ctx,     "内心独白内容缺失（public 应注入）"
assert "不想被看见" not in ctx,   "private 独白不应出现在上下文"
assert "[待说的话]" in ctx,       "缺少待说的话"
assert "[对TA的观察]" in ctx,     "缺少观察"
assert "[最近对话]" in ctx,       "缺少最近对话"
assert "你在吗" in ctx,           "最近对话内容缺失"

ok("核心记忆块存在")
ok("当前情绪块存在")
ok("内心独白块存在（public 注入，private 隔离）")
ok("待说的话块存在")
ok("观察块存在")
ok("最近对话块存在")

# 打印前 400 字供肉眼确认
print("\n  ── 上下文预览（前400字）──")
for line in ctx[:400].splitlines():
    print(f"  {line}")
print("  …\n")


# ────────────────────────────────────────────────────────────────
# [3b] claude -p 可达性
# ────────────────────────────────────────────────────────────────
print("[3b] claude -p 可达性\n")

reply = runner_mod._run_claude(
    prompt="请只回复数字：42，不要其他内容。",
    system="你是一个只输出数字的助手。",
)

if "[错误" in reply:
    print(f"  ⚠  claude -p 不可用: {reply}")
    print("  ─  跳过 3c（需要 claude -p）\n")
    sys.exit(0)

assert reply.strip(), "claude -p 返回空响应"
ok(f"claude -p 响应: {reply.strip()[:60]}")


# ────────────────────────────────────────────────────────────────
# [3c] chat() 完整流程（mock _run_claude）
# ────────────────────────────────────────────────────────────────
print("\n[3c] chat() 完整流程\n")

FAKE_REPLY = "我在的，一直在。你在想什么？"

original_run = runner_mod._run_claude
call_log = []

def _mock_run(prompt, system="", mcp_server=None):
    call_log.append({"prompt": prompt, "system_len": len(system),
                     "has_mcp": mcp_server is not None})
    return FAKE_REPLY

runner_mod._run_claude = _mock_run

seq_before = el.head_seq()

result = runner_mod.chat(
    user_message="你在吗",
    event_log=el,
    cp_store=cp,
    emotion=emo,
    thoughts=tho,
    observations=obs,
)

runner_mod._run_claude = original_run

# 验证返回值
assert result == FAKE_REPLY,   f"chat() 返回值错误: {result!r}"
ok(f"返回值正确: {result!r}")

# 验证 _run_claude 被调用
assert len(call_log) == 1,     "mock 未被调用"
call = call_log[0]
assert "你在吗" in call["prompt"], "用户消息未传入 prompt"
ok(f"_run_claude 被调用，prompt 含用户消息")

# 验证 system prompt 包含记忆上下文
assert call["system_len"] > 500, f"system 太短（{call['system_len']}字），可能没注入记忆"
ok(f"system prompt 长度 {call['system_len']} 字（含记忆上下文）")

# 验证 MCP server 路径被传入
assert call["has_mcp"], "MCP server 未传入"
ok("MCP server 配置已传入")

# 验证用户消息和AI回复都记录到 event_log
seq_after = el.head_seq()
new_events = el.tail(seq_after - seq_before + 2)
# 过滤出新增事件
fresh = [e for e in new_events if e.seq > seq_before]
assert len(fresh) >= 2, f"期望至少2条新事件（user+ai），实际 {len(fresh)} 条"

actors = [e.actor for e in fresh]
assert "user" in actors, "用户消息未记录到 event_log"
assert "ai"   in actors, "AI 回复未记录到 event_log"
ok("用户消息已写入 event_log")
ok("AI 回复已写入 event_log")

# 验证 AI 回复内容正确
ai_events = [e for e in fresh if e.actor == "ai"]
assert any(FAKE_REPLY in e.content for e in ai_events), "event_log 中 AI 内容不匹配"
ok("event_log 中 AI 内容正确")

print("\n✅ 第三步全部通过\n")
