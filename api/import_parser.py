"""
解析 Claude 和 ChatGPT 导出的对话 JSON，转成内部 Event 列表。
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Any


def _iso_to_ts(s: str | None) -> float:
    if not s:
        return 0.0
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.timestamp()
    except Exception:
        return 0.0


def _parse_claude(data: list) -> list[dict]:
    """Claude 导出：conversations.json，每条有 chat_messages 数组。"""
    events: list[dict] = []
    for conv in data:
        for msg in conv.get("chat_messages", []):
            sender = msg.get("sender", "")
            actor = "user" if sender == "human" else "ai"
            # content 可能是字符串或含 text 字段的 list
            raw = msg.get("text") or msg.get("content") or ""
            if isinstance(raw, list):
                raw = " ".join(
                    p.get("text", "") if isinstance(p, dict) else str(p)
                    for p in raw
                )
            content = str(raw).strip()
            if not content:
                continue
            events.append({
                "actor": actor,
                "content": content,
                "ts": _iso_to_ts(msg.get("created_at")),
            })
    return events


def _parse_chatgpt(data: list) -> list[dict]:
    """ChatGPT 导出：conversations.json，每条有 mapping 树。"""
    events: list[dict] = []
    for conv in data:
        mapping: dict[str, Any] = conv.get("mapping", {})
        nodes = [n for n in mapping.values() if n.get("message")]
        nodes.sort(key=lambda n: n["message"].get("create_time") or 0)
        for node in nodes:
            msg = node["message"]
            role = msg.get("author", {}).get("role", "")
            if role not in ("user", "assistant"):
                continue
            parts = msg.get("content", {}).get("parts", [])
            content = " ".join(
                p if isinstance(p, str) else (p.get("text", "") if isinstance(p, dict) else "")
                for p in parts
            ).strip()
            if not content:
                continue
            actor = "user" if role == "user" else "ai"
            ts = msg.get("create_time") or 0.0
            events.append({"actor": actor, "content": content, "ts": float(ts)})
    return events


def detect_and_parse(raw: bytes) -> tuple[list[dict], str]:
    """
    自动识别格式，返回 (events, format_name)。
    format_name: "claude" | "chatgpt"
    """
    data = json.loads(raw)
    if not isinstance(data, list) or not data:
        raise ValueError("JSON 应为非空数组")

    first = data[0]
    if "chat_messages" in first:
        return _parse_claude(data), "claude"
    elif "mapping" in first:
        return _parse_chatgpt(data), "chatgpt"
    else:
        raise ValueError("未识别的格式（需要 Claude 或 ChatGPT 导出的 conversations.json）")
