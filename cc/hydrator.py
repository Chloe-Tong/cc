from typing import Optional, Callable

from .models import Event, HydrationPayload, WindowPolicy
from .event_log import GlobalEventLog
from .checkpoint import CheckpointStore


BridgeFn = Callable[[list[Event]], str]

RAW_TAIL_SIZE = 30


class Hydrator:
    """Builds the hydration payload for a new window.

    Payload = rolling_summary (4-layer checkpoint) + bridge_summary + raw_tail.

    Layout matches the design:
      seq 1..checkpoint       → checkpoint layers (constant / portrait / midground / recent)
      checkpoint+1..head-30   → bridge_summary (compressed by bridge_fn)
      head-29..head           → raw_tail (verbatim)
    """

    def __init__(
        self,
        event_log: GlobalEventLog,
        checkpoint_store: CheckpointStore,
        bridge_fn: BridgeFn,
    ):
        self._log = event_log
        self._cps = checkpoint_store
        self._bridge = bridge_fn

    def hydrate(self, policy: WindowPolicy) -> HydrationPayload:
        head = self._log.head_seq()
        scopes = self._policy_scopes(policy)

        cp = self._cps.latest()

        rolling_summary = (
            {
                "constant": cp.layer_constant,
                "portrait": cp.layer_portrait,
                "midground": cp.layer_midground,
                "recent": cp.layer_recent,
            }
            if cp
            else {}
        )

        covered = cp.covered_through_seq if cp else 0

        raw_tail = self._log.tail(RAW_TAIL_SIZE, scopes=scopes)
        raw_tail_start = raw_tail[0].seq if raw_tail else head + 1

        bridge_events = self._log.range(
            covered,
            through_seq=raw_tail_start - 1,
            scopes=scopes,
            audience_includes=policy.window_id if not policy.share else None,
        )
        bridge_summary = self._bridge(bridge_events) if bridge_events else None

        return HydrationPayload(
            observed_head_seq=head,
            rolling_summary=rolling_summary,
            bridge_summary=bridge_summary,
            raw_tail=raw_tail,
        )

    @staticmethod
    def _policy_scopes(policy: WindowPolicy) -> Optional[set[str]]:
        if policy.scope == "global":
            return None
        if policy.scope == "work":
            return {"work", "global"}
        if policy.scope == "private":
            return {"private", policy.window_id}
        return None
