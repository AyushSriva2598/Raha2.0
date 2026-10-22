"""Compares a fresh build with the GLOoF reference archive (the data the app showed before the old
service went offline). Slow and needs network, so it only runs on request:

    PYTHONPATH=src .venv/bin/python -m pytest -m regression -q

Reads out/archive/south_lhonak.json (build it first with `python -m glof.cli build --lake south_lhonak`).
"""
import json
import statistics
import urllib.request
from pathlib import Path

import pytest

from glof.history import analyse_archive

REFERENCE_URL = "https://raw.githubusercontent.com/Gravyie/GLOoF/HEAD/backend/archive/south_lhonak.json"
OURS = Path(__file__).resolve().parents[1] / "out" / "archive" / "south_lhonak.json"

pytestmark = pytest.mark.regression


@pytest.fixture(scope="module")
def both():
    if not OURS.exists():
        pytest.skip("build the archive first")
    ref = json.loads(urllib.request.urlopen(REFERENCE_URL, timeout=60).read())
    return ref, json.loads(OURS.read_text())


def test_same_scenes_and_areas(both):
    ref, ours = both
    ref_by = {f["date"]: f["stats"]["lake_area_m2"] for f in ref["frames"]}
    our_by = {f["date"]: f["stats"]["lake_area_m2"] for f in ours["frames"]}
    shared = sorted(set(ref_by) & set(our_by))
    print(f"reference {len(ref_by)} frames, ours {len(our_by)}, shared {len(shared)}")
    assert len(shared) >= 0.6 * len(ref_by), "most reference scenes should also be in our archive"
    diffs = [abs(our_by[d] - ref_by[d]) / ref_by[d] for d in shared]
    assert statistics.median(diffs) < 0.03, f"median area difference {statistics.median(diffs):.1%}"
    assert max(diffs) < 0.15


def test_same_risk_story(both):
    ref, ours = both
    levels = lambda doc: [e["to"] for e in analyse_archive(doc)["events"] if e["escalation"]]
    assert levels(ours)[:3] == levels(ref)[:3] == ["WATCH", "ADVISORY", "WARNING"]
    assert analyse_archive(ours)["frames"][-1]["level"] == analyse_archive(ref)["frames"][-1]["level"]
