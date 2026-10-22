"""Alert levels and the hysteresis state machine.

Levels: NORMAL < WATCH < ADVISORY < WARNING < EVACUATE. Thresholds that produce the levels live in
history.py and are PLACEHOLDERS: they must be calibrated per lake with the disaster-management authority.
"""
from __future__ import annotations

from dataclasses import dataclass

LEVELS = ["NORMAL", "WATCH", "ADVISORY", "WARNING", "EVACUATE"]
RANK = {name: i for i, name in enumerate(LEVELS)}


@dataclass(frozen=True)
class TrackerThresholds:
    escalate_persistence: int = 2  # consecutive evaluations before WATCH/ADVISORY
    deescalate_persistence: int = 3  # consecutive lower evaluations to step down


class RiskTracker:
    """Hysteresis so a noisy indicator does not flap the alert level.

    * WARNING/EVACUATE: escalate immediately; never step down automatically (an operator must clear()).
    * WATCH/ADVISORY: need escalate_persistence consecutive evaluations.
    * Step down one level at a time after deescalate_persistence lower ones.
    """

    def __init__(self, th: TrackerThresholds | None = None) -> None:
        self.th = th or TrackerThresholds()
        self.level = "NORMAL"
        self._up = 0
        self._down = 0

    def step(self, raw_level: str) -> tuple[str, str | None]:
        """Returns (current_level, previous_level_if_changed)."""
        prev, raw = self.level, RANK[raw_level]
        cur = RANK[self.level]
        if raw > cur:
            self._down = 0
            if raw >= RANK["WARNING"]:
                self.level = raw_level
            else:
                self._up += 1
                if self._up >= self.th.escalate_persistence:
                    self.level, self._up = raw_level, 0
        elif raw < cur and cur < RANK["WARNING"]:
            self._up = 0
            self._down += 1
            if self._down >= self.th.deescalate_persistence:
                self.level, self._down = LEVELS[cur - 1], 0
        else:
            self._up = self._down = 0
        return self.level, (prev if prev != self.level else None)

    def clear(self) -> None:
        self.level, self._up, self._down = "NORMAL", 0, 0
