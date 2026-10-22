"""Ingest handler: it must never alert on history, announce each level once, and respect freshness."""
from datetime import datetime, timezone

from glof.config import LAKES
from glof.events import RecordingPublisher
from glof.handler import process_lake, run
from glof.history import analyse_archive
from glof.store import LocalStore

from test_archive_risk import doc, frame, square
from test_publish import LAKE_META

LAKE = LAKES["south_lhonak"]


def archive(growth_2021: float = 1.0, last_date: str = "2021-10-25"):
    frames = [frame(f"2018-10-{d:02d}", 150) for d in (1, 10, 20)]
    frames += [frame(f"2021-10-{d:02d}", 150 * growth_2021, square(500, stretch_east_m=320 if growth_2021 > 1 else 0)) for d in (5, 15, 25)]
    frames[-1]["date"] = last_date
    d = doc(frames)
    d["lake"] = LAKE_META
    return d


class FakeBuilder:
    """Stands in for ArchiveBuilder: returns a prepared archive and reports which frames are 'new'."""

    def __init__(self, docs: list[dict]):
        self.docs = list(docs)

    def update(self, lake, existing, *, now=None):
        d = self.docs.pop(0) if len(self.docs) > 1 else self.docs[0]
        known = {f["date"] for f in (existing or {}).get("frames", [])}
        return d, [f for f in d["frames"] if f["date"] not in known]


NOW_FRESH = datetime(2021, 10, 27, tzinfo=timezone.utc)  # 2 days after the last frame
NOW_STALE = datetime(2022, 3, 1, tzinfo=timezone.utc)


def go(store, builder, pub, now, **kw):
    return process_lake(LAKE, store, builder, pub, dry_run=kw.pop("dry_run", False), force_level=kw.pop("force_level", None), now=now)


def test_first_sight_records_the_level_and_never_alerts(tmp_path):
    store, pub = LocalStore(tmp_path), RecordingPublisher()
    d = archive(growth_2021=1.3)  # already WARNING-level history
    assert analyse_archive(d)["frames"][-1]["level"] in ("WARNING", "EVACUATE")
    r = go(store, FakeBuilder([d]), pub, NOW_FRESH)
    assert pub.events == [] and r["events"] == []
    assert store.load("state/south_lhonak")["bootstrapped"] is True
    assert store.load("public/south_lhonak") is not None  # but the data is published


def test_escalation_is_announced_once(tmp_path):
    store, pub = LocalStore(tmp_path), RecordingPublisher()
    calm = archive(1.0)
    go(store, FakeBuilder([calm]), pub, NOW_FRESH)  # bootstrap at NORMAL
    grown = archive(1.3, last_date="2021-11-01")
    go(store, FakeBuilder([grown]), pub, datetime(2021, 11, 3, tzinfo=timezone.utc))
    assert len(pub.events) == 1
    ev = pub.events[0]
    assert ev["lake"] == "south_lhonak" and ev["from"] == "NORMAL" and ev["to"] in ("WARNING", "EVACUATE") and ev["drill"] is False
    assert ev["reasons"]
    go(store, FakeBuilder([grown]), pub, datetime(2021, 11, 4, tzinfo=timezone.utc))
    assert len(pub.events) == 1  # not repeated the next day


def test_a_stale_scene_cannot_raise_an_alert(tmp_path):
    store, pub = LocalStore(tmp_path), RecordingPublisher()
    go(store, FakeBuilder([archive(1.0)]), pub, NOW_FRESH)
    go(store, FakeBuilder([archive(1.3, last_date="2021-11-01")]), pub, NOW_STALE)  # months old
    assert pub.events == []


def test_dry_run_writes_nothing(tmp_path):
    store, pub = LocalStore(tmp_path), RecordingPublisher()
    go(store, FakeBuilder([archive(1.0)]), pub, NOW_FRESH, dry_run=True)
    assert store.load("state/south_lhonak") is None and store.load("public/south_lhonak") is None


def test_drill_sends_a_marked_event_without_changing_state(tmp_path):
    store, pub = LocalStore(tmp_path), RecordingPublisher()
    d = archive(1.0)
    go(store, FakeBuilder([d]), pub, NOW_FRESH)
    before = store.load("state/south_lhonak")
    go(store, FakeBuilder([d]), pub, NOW_FRESH, force_level="WARNING")
    assert len(pub.events) == 1 and pub.events[0]["drill"] is True and "DRILL" in pub.events[0]["reasons"][0]
    assert store.load("state/south_lhonak") == before


def test_run_with_dry_run_never_touches_aws(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from glof.config import get_settings

    get_settings.cache_clear()
    rep = run({"dry_run": True, "lakes": ["south_lhonak"]}, store=LocalStore(tmp_path), builder=FakeBuilder([archive(1.0)]), now=NOW_FRESH)
    assert rep["dry_run"] is True and rep["lakes"]["south_lhonak"]["level"] == "NORMAL"
