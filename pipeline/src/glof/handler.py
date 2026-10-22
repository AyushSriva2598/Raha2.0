"""AWS Lambda: scheduled ingest of new Sentinel-2 scenes.

Triggered daily by EventBridge. For every monitored lake:
  1. load the archive from the data bucket
  2. analyse scenes newer than the last frame and append them
  3. re-run the risk timeline and re-publish public/<lake>.json
  4. if the level ESCALATED since we last announced one, publish a LakeEscalated event

Safety rules (nothing here sends a message; it only reports):
  * first sight of a lake only records its current level: the historical archive never raises an alert
  * a level is announced once (state/<lake>.json holds the last announced level)
  * only scenes acquired within ALERT_MAX_AGE_DAYS can raise an alert
  * WARNING/EVACUATE are never stepped down automatically (an operator clears them)

Event overrides (all optional): {"lakes": ["south_lhonak"], "dry_run": true, "force_level": "WARNING"}
force_level rehearses the path end to end and is marked as a drill in the event.
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from .archive import ArchiveBuilder
from .config import LAKES, Lake, get_settings
from .events import EventBridgePublisher, EventPublisher, RecordingPublisher
from .history import analyse_archive
from .publish import publish_index, publish_lake
from .risk import RANK
from .stac import StacSceneFinder
from .store import Store, make_store

log = logging.getLogger()
log.setLevel(logging.INFO)

ALERT_MAX_AGE_DAYS = int(os.environ.get("ALERT_MAX_AGE_DAYS", "14"))


def _age_days(frame_date: str, now: datetime) -> int:
    return (now.date() - datetime.fromisoformat(frame_date).date()).days


def process_lake(
    lake: Lake,
    store: Store,
    builder: ArchiveBuilder,
    publisher: EventPublisher,
    *,
    dry_run: bool,
    force_level: str | None,
    now: datetime,
) -> dict[str, Any]:
    doc, fresh = builder.update(lake, store.load(f"archive/{lake.id}"), now=now)
    if not doc["frames"]:
        return {"new_frames": [], "frames_total": 0, "level": None, "events": []}

    timeline = analyse_archive(doc)
    latest = timeline["frames"][-1]
    level = force_level or latest["level"]
    state = store.load(f"state/{lake.id}")
    sent: list[dict[str, Any]] = []
    new_state = state

    if state is None:
        # First sight of this lake: record where it stands, never alert about history.
        new_state = {"notified_level": latest["level"], "bootstrapped": True, "at": now.isoformat()}
    elif RANK[level] > RANK[state["notified_level"]]:
        fresh_enough = _age_days(latest["date"], now) <= ALERT_MAX_AGE_DAYS
        if fresh_enough or force_level:
            reasons = latest["reasons"]
            if force_level:
                reasons = [{"level": level, "text": "DRILL: forced level to test the notification path"}] + reasons
            detail = {
                "lake": lake.id,
                "lakeName": lake.name,
                "from": state["notified_level"],
                "to": level,
                "frameDate": latest["date"],
                "scene": doc["frames"][-1]["scene"],
                "reasons": [r["text"] for r in reasons],
                "drill": bool(force_level),
                "detectedAt": now.isoformat(),
            }
            publisher.publish(detail)
            sent.append(detail)
            if not force_level:
                new_state = {"notified_level": level, "at": now.isoformat(), "frame_date": latest["date"]}
    elif RANK[level] < RANK[state["notified_level"]] < RANK["WARNING"]:
        new_state = {**state, "notified_level": level}  # step down silently below WARNING

    if not dry_run:
        if fresh or store.load(f"public/{lake.id}") is None:
            store.save(f"archive/{lake.id}", doc)
            publish_lake(store, doc)
        if new_state is not state:
            store.save(f"state/{lake.id}", new_state)

    return {
        "new_frames": [f["date"] for f in fresh],
        "frames_total": len(doc["frames"]),
        "latest_date": latest["date"],
        "level": level,
        "announced_level": (new_state or state or {}).get("notified_level"),
        "events": [{"to": e["to"], "drill": e["drill"]} for e in sent],
        "doc": doc,
    }


def run(
    event: dict[str, Any] | None = None,
    *,
    store: Store | None = None,
    builder: ArchiveBuilder | None = None,
    publisher: EventPublisher | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    event = event or {}
    s = get_settings()
    store = store or make_store(s)
    builder = builder or ArchiveBuilder(s, StacSceneFinder(s))
    dry_run = bool(event.get("dry_run", False))
    if publisher is None:
        publisher = (
            RecordingPublisher()
            if dry_run
            else EventBridgePublisher(os.environ.get("EVENT_BUS_NAME", "default"), s.aws_region)
        )
    now = now or datetime.now(timezone.utc)
    report: dict[str, Any] = {"ran_at": now.isoformat(), "dry_run": dry_run, "lakes": {}}
    docs: list[dict[str, Any]] = []

    for lake_id in event.get("lakes") or list(LAKES):
        result = process_lake(
            LAKES[lake_id], store, builder, publisher, dry_run=dry_run, force_level=event.get("force_level"), now=now
        )
        doc = result.pop("doc", None)
        if doc and doc["frames"]:
            docs.append(doc)
        report["lakes"][lake_id] = result

    if docs and not dry_run:
        publish_index(store, docs)
    log.info(json.dumps(report))
    emit_success_metric()
    return report


def emit_success_metric() -> None:
    """CloudWatch Embedded Metric Format: one IngestSuccess datapoint per completed run. The
    "no successful ingest in 48 h" alarm watches for its absence. Printing needs no extra IAM permission."""
    print(
        json.dumps(
            {
                "_aws": {
                    "Timestamp": int(time.time() * 1000),
                    "CloudWatchMetrics": [
                        {"Namespace": "Raha/Glof", "Dimensions": [[]], "Metrics": [{"Name": "IngestSuccess", "Unit": "Count"}]}
                    ],
                },
                "IngestSuccess": 1,
            }
        )
    )


def handler(event, context):  # noqa: ARG001 - Lambda signature
    return run(event if isinstance(event, dict) else {})
