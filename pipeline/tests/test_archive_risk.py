"""Boundary maths, frame selection and the risk timeline (adapted from the GLOoF test suite)."""
from glof.archive import drop_outliers, thin_frames
from glof.boundary import advance_retreat, frozen_fraction, lake_body, to_metric
from glof.history import analyse_archive

LON, LAT = 88.196, 27.911
DEG_M = 1 / 98_000  # ~1 m in degrees at this latitude (x); good enough for tests


def square(half_m, cx=LON, cy=LAT, stretch_east_m=0.0):
    h = half_m * DEG_M
    e = (half_m + stretch_east_m) * DEG_M
    return {"type": "Polygon", "coordinates": [[[cx - h, cy - h], [cx + e, cy - h], [cx + e, cy + h], [cx - h, cy + h], [cx - h, cy - h]]]}


def frame(date, area_ha, geom=None, frozen=0.0):
    geom = geom or square(500)
    return {
        "date": date,
        "scene": f"S2_{date}",
        "stats": {"lake_area_m2": area_ha * 1e4, "ice_area_m2": 0.0, "frozen_fraction": frozen, "cloud_fraction": 0.0},
        "lake": {"type": "Feature", "properties": {}, "geometry": geom},
        "water": {"type": "FeatureCollection", "features": []},
        "ice": None,
    }


def doc(frames):
    return {"lake": {"id": "south_lhonak", "utm_epsg": 32645}, "frames": frames}


def test_advance_measures_how_far_the_shoreline_moved():
    base = to_metric(square(500), 32645)
    grown = to_metric(square(500, stretch_east_m=200), 32645)
    adv, ret = advance_retreat(grown, base)
    assert 180 < adv < 230 and ret == 0.0


def test_lake_body_strips_inflow_stream():
    from shapely.geometry import LineString

    lake = to_metric(square(500), 32645)
    thin = LineString([(lake.bounds[2], lake.centroid.y), (lake.bounds[2] + 1500, lake.centroid.y)]).buffer(4)
    assert lake_body(lake.union(thin)).bounds[2] < lake.bounds[2] + 5


def test_frozen_lake_is_not_drainage():
    ice = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": square(500)}]}
    assert frozen_fraction(square(500), ice, 32645) > 0.95


def test_outliers_and_thinning():
    fr = [frame(f"2020-10-{d:02d}", a) for d, a in [(1, 150), (3, 151), (5, 20), (12, 152), (14, 153), (30, 154)]]
    kept = drop_outliers(fr)
    assert all(f["stats"]["lake_area_m2"] > 100e4 for f in kept)
    assert [f["date"] for f in thin_frames(kept, 8)] == ["2020-10-01", "2020-10-12", "2020-10-30"]


def test_timeline_escalates_on_sustained_growth_without_lookahead():
    frames = [frame(f"2018-10-{d:02d}", 150) for d in (1, 10, 20)]
    frames += [
        frame(f"{y}-10-{d:02d}", 150 * g, square(500, stretch_east_m=60 * (y - 2018)))
        for y, g in [(2019, 1.04), (2020, 1.12), (2021, 1.2), (2022, 1.3)]
        for d in (5, 15, 25)
    ]
    tl = analyse_archive(doc(frames))
    levels = [f["level"] for f in tl["frames"]]
    assert levels[:3] == ["NORMAL"] * 3
    assert "WARNING" in levels and levels.index("WARNING") >= 12  # only once growth is critical
    ups = [e for e in tl["events"] if e["escalation"]]
    assert ups and ups[0]["to"] == "WATCH"
    # adding a future frame never changes the past
    tl2 = analyse_archive(doc(frames + [frame("2023-10-05", 400)]))
    assert [f["level"] for f in tl2["frames"][:-1]] == levels


def test_sudden_drainage_is_evacuate():
    frames = [frame(f"2019-10-{d:02d}", 150) for d in (1, 10, 20)]
    frames += [frame("2019-10-25", 150), frame("2019-11-01", 110), frame("2019-11-03", 108)]
    tl = analyse_archive(doc(frames))
    assert tl["frames"][-1]["level"] == "EVACUATE"
    assert tl["frames"][-1]["indicators"]["drainage"] is True


def test_warning_is_never_cleared_automatically():
    frames = [frame(f"2018-10-{d:02d}", 150) for d in (1, 10, 20)]
    frames += [frame(f"2020-10-{d:02d}", 200) for d in (5, 15, 25)]  # +33%: warning
    frames += [frame(f"2021-10-{d:02d}", 150) for d in (5, 15, 25, 29)]  # back to baseline size
    tl = analyse_archive(doc(frames))
    assert tl["frames"][-1]["level"] in ("WARNING", "EVACUATE")
