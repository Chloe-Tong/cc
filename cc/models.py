from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class Event:
    seq: int
    actor: str          # "user" | "ai" | "agent:<name>"
    source: str         # window_id
    scope: str          # "private" | "work" | "global"
    audience: list[str] # window_ids or ["*"]
    content: str
    based_on_seq: int   # watermark at write time
    created_at: float = field(default_factory=time.time)


@dataclass
class Checkpoint:
    id: int
    covered_through_seq: int
    layer_constant: str   # 常量: long-term character / invariants
    layer_portrait: str   # 画像: user portrait
    layer_midground: str  # 中景: mid-term context
    layer_recent: str     # 近期: recent period summary
    created_at: float = field(default_factory=time.time)


@dataclass
class WindowPolicy:
    window_id: str
    scope: str           # filter: only receive events matching this scope
    share: bool          # whether this window's events are visible to others
    observed_head_seq: int = 0  # last seen watermark


@dataclass
class HydrationPayload:
    observed_head_seq: int
    rolling_summary: dict        # {constant, portrait, midground, recent}
    bridge_summary: Optional[str]  # checkpoint gap → head, compressed
    raw_tail: list[Event]        # last N events verbatim
