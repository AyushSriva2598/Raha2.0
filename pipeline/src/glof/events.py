"""Escalation events: published to EventBridge, consumed by the alerting Lambda.

The pipeline only *reports* that a lake escalated; deciding whether anybody is messaged (and who) is the
alerting function's job, behind its own gates. This keeps data processing and delivery separate.
"""
from __future__ import annotations

import json
from typing import Any

SOURCE = "raha.glof"
DETAIL_TYPE = "LakeEscalated"


class EventPublisher:
    def publish(self, detail: dict[str, Any]) -> None:
        raise NotImplementedError


class EventBridgePublisher(EventPublisher):
    def __init__(self, bus_name: str = "default", region: str | None = None, client: Any = None) -> None:
        import boto3

        self.bus_name = bus_name
        self._client = client or boto3.client("events", region_name=region)

    def publish(self, detail: dict[str, Any]) -> None:
        resp = self._client.put_events(
            Entries=[
                {"Source": SOURCE, "DetailType": DETAIL_TYPE, "Detail": json.dumps(detail), "EventBusName": self.bus_name}
            ]
        )
        if resp.get("FailedEntryCount"):
            raise RuntimeError(f"EventBridge rejected the event: {resp['Entries']}")


class RecordingPublisher(EventPublisher):
    """For dry runs and tests: remembers events instead of sending them."""

    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def publish(self, detail: dict[str, Any]) -> None:
        self.events.append(detail)
