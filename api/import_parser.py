"""
解析 Claude 和 ChatGPT 导出的对话 JSON，转成内部 Event 列表。

导出文件是外部数据，字段随时可能是 null、缺失或类型不符（例如空对话的
chat_messages 是 null）。这里对每一层都做防御，遇到看不懂的条目就跳过并计数，
绝不让单条脏数据把整次导入打成 500。
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Any


def _to_ts(v: Any) -> float:
    """接受 ISO 字符串或数字时间戳，无法识别时返回 0.0。"""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    if not isinstance(v, str) or not v:
        return 0.0
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _text_from(raw: Any) -> str:
    """从 text / content 字段里抽出纯文本，兼容字符串、内容块数组、单个内容块。"""
    if raw is None:
        return ""
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, dict):
        return str(raw.get("text") or "").strip()
    if isinstance(raw, list):
        parts = []
        for p in raw:
            if isinstance(p, str):
                parts.append(p)
            elif isinstance(p, dict):
                # tool_use / thinking 等块没有 text，跳过即可
                t = p.get("text")
                if isinstance(t, str):
                    parts.append(t)
        return " ".join(parts).strip()
    return ""


def _parse_claude(data: list) -> tuple[list[dict], int]:
    """Claude 导出：conversations.json，每条有 chat_messages 数组。"""
    events: list[dict] = []
    skipped_bad = 0
    for conv in data:
        if not isinstance(conv, dict):
            skipped_bad += 1
            continue
        msgs = conv.get("chat_messages")
        if not isinstance(msgs, list):
            # 空对话常见写成 null；不是列表就没有可导入的内容
            if msgs is not None:
                skipped_bad += 1
            continue
        for msg in msgs:
            if not isinstance(msg, dict):
                skipped_bad += 1
                continue
            content = _text_from(msg.get("text")) or _text_from(msg.get("content"))
            if not content:
                continue
            actor = "user" if msg.get("sender") == "human" else "ai"
            events.append({
                "actor": actor,
                "content": content,
                "ts": _to_ts(msg.get("created_at")),
            })
    return events, skipped_bad


def _parse_chatgpt(data: list) -> tuple[list[dict], int]:
    """ChatGPT 导出：conversations.json，每条有 mapping 树。"""
    events: list[dict] = []
    skipped_bad = 0
    for conv in data:
        if not isinstance(conv, dict):
            skipped_bad += 1
            continue
        mapping = conv.get("mapping")
        if not isinstance(mapping, dict):
            if mapping is not None:
                skipped_bad += 1
            continue

        nodes = []
        for n in mapping.values():
            if isinstance(n, dict) and isinstance(n.get("message"), dict):
                nodes.append(n)
        nodes.sort(key=lambda n: _to_ts(n["message"].get("create_time")))

        for node in nodes:
            msg = node["message"]
            author = msg.get("author")
            role = author.get("role", "") if isinstance(author, dict) else ""
            if role not in ("user", "assistant"):
                continue
            content_obj = msg.get("content")
            parts = content_obj.get("parts") if isinstance(content_obj, dict) else None
            content = _text_from(parts if isinstance(parts, list) else content_obj)
            if not content:
                continue
            events.append({
                "actor": "user" if role == "user" else "ai",
                "content": content,
                "ts": _to_ts(msg.get("create_time")),
            })
    return events, skipped_bad


def detect_and_parse(raw: bytes) -> tuple[list[dict], str, int]:
    """
    自动识别格式，返回 (events, format_name, skipped_malformed)。
    format_name: "claude" | "chatgpt"
    """
    try:
        data = json.loads(raw)
    except UnicodeDecodeError:
        raise ValueError("文件不是 UTF-8 编码的文本")
    if not isinstance(data, list) or not data:
        raise ValueError("JSON 应为非空数组（Claude/ChatGPT 导出的 conversations.json 顶层是数组）")

    # 首条可能是脏数据，扫描前几条来判断格式
    fmt = ""
    for item in data[:50]:
        if not isinstance(item, dict):
            continue
        if "chat_messages" in item:
            fmt = "claude"
            break
        if "mapping" in item:
            fmt = "chatgpt"
            break
    if not fmt:
        raise ValueError("未识别的格式（需要 Claude 或 ChatGPT 导出的 conversations.json）")

    events, bad = _parse_claude(data) if fmt == "claude" else _parse_chatgpt(data)
    return events, fmt, bad
