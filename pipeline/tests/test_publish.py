"""The slim public document is the contract the Raha app reads (frontend/src/types GlofLakeData)."""
from glof.publish import build_public, publish_index, publish_lake
from glof.store import LocalStore

from test_archive_risk import doc, frame, square

LAKE_META = {
    "id": "south_lhonak", "name": "South Lhonak Lake", "country": "India (Sikkim)", "center": [88.196, 27.911],
    "bbox": [88.171, 27.886, 88.221, 27.936], "lake_elevation_m": 5200, "utm_epsg": 32645,
    "events": [{"date": "2023-10-04", "label": "Outburst flood (GLOF)", "detail": "x"}],
}


def archive():
    frames = [frame(f"2018-10-{d:02d}", 150) for d in (1, 10, 20)]
    frames += [frame(f"2021-10-{d:02d}", 190, square(500, stretch_east_m=320)) for d in (5, 15, 25)]
    d = doc(frames)
    d["lake"] = LAKE_META
    return d


def test_public_document_has_every_field_the_app_reads():
    pub = build_public(archive())
    assert set(pub) >= {"lake", "archiveAvailable", "baseline", "thresholds", "levelChanges", "frames", "latest", "attribution", "retrievedAt"}
    assert set(pub["lake"]) == {"id", "name", "country", "center", "bbox", "elevationM", "events"}
    f = pub["frames"][-1]
    assert set(f) == {"i", "date", "scene", "level", "rawLevel", "areaHa", "advanceM", "growthPct", "iceAreaKm2", "reasons", "flags", "geometry"}
    assert f["geometry"]["type"] in ("Polygon", "MultiPolygon")
    assert pub["archiveAvailable"] is True and pub["baseline"]["label"] == "2018"
    assert pub["thresholds"]["advance_watch_m"] == 150.0
    assert pub["latest"]["acquired"] == f["date"]
    assert "not an official warning" in pub["attribution"]["caveat"]


def test_coordinates_are_rounded_and_outlines_are_slim():
    pub = build_public(archive())
    ring = pub["frames"][0]["geometry"]["coordinates"][0]
    assert all(len(str(c).split(".")[-1]) <= 5 for p in ring for c in p)
    assert "water" not in pub["frames"][0] and "ice" not in pub["frames"][0]


def test_level_changes_list_reasons_as_text():
    pub = build_public(archive())
    assert pub["levelChanges"] and all(isinstance(r, str) for e in pub["levelChanges"] for r in e["reasons"])


def test_publish_writes_lake_and_index(tmp_path):
    store = LocalStore(tmp_path)
    d = archive()
    publish_lake(store, d)
    publish_index(store, [d])
    assert store.load("public/south_lhonak")["lake"]["id"] == "south_lhonak"
    assert store.load("public/lakes") == [
        {"id": "south_lhonak", "name": "South Lhonak Lake", "country": "India (Sikkim)", "center": [88.196, 27.911], "elevationM": 5200}
    ]
