from .models import Event, WindowPolicy
from .event_log import GlobalEventLog


DELTA_BUDGET = 30


class DeltaSync:
    """Active window: pull only unseen, allowed new events.

    Append-only prefix — deltas are never recalled, rewritten, or merged.
    Prefix-cache friendly: stable prefix grows naturally.
    Budget threshold: when delta exceeds DELTA_BUDGET a full re-hydration
    is recommended instead (caller decides).
    """

    def __init__(self, event_log: GlobalEventLog):
        self._log = event_log

    def pull(
        self, policy: WindowPolicy
    ) -> tuple[list[Event], bool]:
        """Return (new_events, needs_rehydration).

        new_events: seq > policy.observed_head_seq, filtered by policy.
        needs_rehydration: True when delta exceeds budget → caller should
                           rebuild context via Hydrator instead.
        """
        head = self._log.head_seq()
        if head <= policy.observed_head_seq:
            return [], False

        scopes = _policy_scopes(policy)
        new_events = self._log.range(
            policy.observed_head_seq,
            scopes=scopes,
            audience_includes=policy.window_id if not policy.share else None,
        )

        # Filter out events from self (source == window_id) — already in context
        new_events = [e for e in new_events if e.source != policy.window_id]

        needs_rehydration = len(new_events) > DELTA_BUDGET
        return new_events, needs_rehydration

    def advance(self, policy: WindowPolicy, events: list[Event]) -> WindowPolicy:
        """Advance the policy watermark after consuming events."""
        if events:
            policy.observed_head_seq = events[-1].seq
        return policy


def _policy_scopes(policy: WindowPolicy):
    if policy.scope == "global":
        return None
    if policy.scope == "work":
        return {"work", "global"}
    if policy.scope == "private":
        return {"private", policy.window_id}
    return None
