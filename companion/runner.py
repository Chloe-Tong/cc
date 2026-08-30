"""
晓的对话入口 — 使用 claude -p 运行，注入记忆上下文。
"""
import json
import subprocess
from pathlib import Path

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.inner_thoughts import InnerThoughtStore
from companion.observation_log import ObservationLog

SYSTEM_PROMPT_PATH = Path(__file__).parent / "system_prompt.md"
MCP_SERVER_PATH    = Path(__file__).parent.parent / "mcp_server" / "server.py"


def make_summarize_fn():
    """
    返回一个符合 CheckpointWorker.SummarizeFn 签名的函数。
    用 claude -p 把 episodic 事件压缩成 4 层记忆。
    """
    def summarize(events, previous_cp) -> dict:
        prev_summary = ""
        if previous_cp:
            prev_summary = f"""
上一次记忆快照：
- 常量层：{previous_cp.layer_constant}
- 画像层：{previous_cp.layer_portrait}
- 中景层：{previous_cp.layer_midground}
- 近期层：{previous_cp.layer_recent}
"""

        events_text = "\n".join(
            f"[{e.actor}] {e.content}" for e in events
        )

        prompt = f"""{prev_summary}
请将以下对话事件压缩成 4 层记忆。严格按 JSON 输出，不要其他内容。

事件：
{events_text}

输出格式：
{{
  "constant":  "关于这段关系或晓本身不会变的核心事实（1-2句）",
  "portrait":  "用户的性格/偏好/习惯画像（2-3句）",
  "midground": "中期上下文：过去几天/周的主要话题和状态（2-4句）",
  "recent":    "最近一段时间发生的事，情绪走向（3-5句）"
}}"""

        result = _run_claude(prompt, system="你是一个记忆压缩专家，只输出 JSON。")
        try:
            return json.loads(result.strip())
        except json.JSONDecodeError:
            # fallback: return raw text in recent layer
            return {
                "constant": previous_cp.layer_constant if previous_cp else "",
                "portrait": previous_cp.layer_portrait if previous_cp else "",
                "midground": previous_cp.layer_midground if previous_cp else "",
                "recent": result[:500],
            }

    return summarize


def build_context(
    event_log: GlobalEventLog,
    cp_store: CheckpointStore,
    emotion: EmotionStore,
    thoughts: PendingThoughtStore,
    inner_thoughts: InnerThoughtStore,
    observations: ObservationLog,
) -> str:
    """把记忆层组装成注入到晓的 system prompt 的上下文块。"""
    parts = []

    cp = cp_store.latest()
    if cp:
        parts.append(f"[核心记忆]\n常量: {cp.layer_constant}\n画像: {cp.layer_portrait}\n中景: {cp.layer_midground}\n近期: {cp.layer_recent}")

    emo = emotion.current()
    if emo:
        drift = f" → 漂移中：{emo.drifting_toward}" if emo.drifting_toward else ""
        trigger = f"（因为：{emo.trigger}）" if emo.trigger else ""
        parts.append(f"[当前情绪]\n{emo.primary}（强度 {emo.intensity:.0%}）{trigger}{drift}")

    # 内心独白：只注入 public 的（private 的存在但不透传给对话上下文）
    soliloquy = inner_thoughts.recent(limit=5, visibility="public")
    if soliloquy:
        items = "\n".join(f"- {t.content}" for t in soliloquy)
        parts.append(f"[内心独白]\n（这些是你自己的碎思，不是要说给TA的话）\n{items}")

    # 待说的话：打算在对话中说出口的内容
    pending = thoughts.pending()
    if pending:
        items = "\n".join(f"- [{t.priority}] {t.content}" for t in pending)
        parts.append(f"[待说的话]\n{items}")

    obs = observations.recent(limit=8)
    if obs:
        items = "\n".join(f"- [{o.category}] {o.content}" for o in obs)
        parts.append(f"[对TA的观察]\n{items}")

    tail = event_log.tail(8)
    if tail:
        items = "\n".join(f"[{e.actor}] {e.content}" for e in tail)
        parts.append(f"[最近对话]\n{items}")

    return "\n\n".join(parts)



def _run_claude(prompt: str, system: str = "", mcp_server: str | None = None) -> str:
    """调用 `claude -p` 并返回输出文本。"""
    cmd = ["claude", "-p", prompt]
    if system:
        cmd += ["--system-prompt", system]
    if mcp_server:
        cmd += ["--mcp-config", _mcp_config(mcp_server)]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )
        return result.stdout.strip() or result.stderr.strip()
    except FileNotFoundError:
        return "[错误: claude CLI 未找到，请确认已安装 Claude Code]"
    except subprocess.TimeoutExpired:
        return "[错误: claude 响应超时]"


def _mcp_config(server_path: str) -> str:
    """生成临时 MCP config 文件路径，写入 json 并返回路径。"""
    import tempfile, os
    config = {
        "mcpServers": {
            "evermind": {
                "command": "python",
                "args": [server_path],
            }
        }
    }
    fd, path = tempfile.mkstemp(suffix=".json", prefix="evermind_mcp_")
    with os.fdopen(fd, "w") as f:
        json.dump(config, f)
    return path
