"""Slim, app-facing JSON built from an archive document: the contract the Raha app consumes.

The full archive (every outline, ice, context water) is large; the app needs only the main water body per
scene, its alert level and the numbers behind it. Output matches `GlofLakeData` in
frontend/src/types/index.ts and is validated against contracts/glof-lake.schema.json in the tests.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .history import analyse_archive
from .store import Store

ATTRIBUTION = {
    "imagery": "Contains modified Copernicus Sentinel-2 data (ESA), via AWS Earth Search / AWS Open Data",
    "terrain": "Terrain: Terrarium elevation tiles, AWS Open Data",
    "method": "Water mapped with NDWI > 0.1 on cloud-masked Sentinel-2 L2A scenes; debris-covered ice is not detected.",
    "caveat": "Alert thresholds are placeholders pending calibration with the local authority. "
    "This is not an official warning.",
    "service": "Raha glacial lake pipeline (Sentinel-2 L2A via AWS Earth Search)",
}


def _round5(c: Any) -> Any:
    if isinstance(c, (list, tuple)):
        if c and isinstance(c[0], (int, float)):
            return [round(float(v), 5) for v in c]
        return [_round5(x) for x in c]
    return c


def build_public(doc: dict[str, Any], *, now: datetime | None = None) -> dict[str, Any]:
    """Archive document -> slim public document."""
    tl = analyse_archive(doc)
    tl_frames = tl["frames"]
    frames = []
    for i, f in enumerate(doc["frames"]):
        t = tl_frames[i]
        ind = t["indicators"]
        ice_m2 = f["stats"].get("ice_area_m2")
        geom = f["lake"]["geometry"]
        frames.append(
            {
                "i": i,
                "date": f["date"],
                "scene": f["scene"],
                "level": t["level"],
                "rawLevel": t["raw_level"],
                "areaHa": round(f["stats"]["lake_area_m2"] / 1e4, 2),
                "advanceM": ind.get("advance_m"),
                "growthPct": ind.get("growth_pct"),
                "iceAreaKm2": round(ice_m2 / 1e6, 2) if ice_m2 is not None else None,
                "reasons": [{"level": r["level"], "text": r["text"]} for r in t["reasons"]],
                "flags": t["flags"],
                "geometry": {"type": geom["type"], "coordinates": _round5(geom["coordinates"])},
            }
        )
    last = frames[-1] if frames else None
    lake = doc["lake"]
    base = tl.get("baseline")
    return {
        "lake": {
            "id": lake["id"],
            "name": lake["name"],
            "country": lake["country"],
            "center": lake["center"],
            "bbox": lake["bbox"],
            "elevationM": lake["lake_elevation_m"],
            "events": lake.get("events", []),
        },
        "archiveAvailable": True,
        "baseline": {"areaHa": round(base["area_m2"] / 1e4, 2), "label": base["label"]} if base else None,
        "thresholds": tl.get("thresholds"),
        "levelChanges": [
            {"date": e["date"], "from": e["from"], "to": e["to"], "reasons": [r["text"] for r in e["reasons"]]}
            for e in tl["events"]
        ],
        "frames": frames,
        "latest": {
            "scene": last["scene"],
            "acquired": last["date"],
            "waterAreaHa": last["areaHa"],
            "iceAreaHa": round((last["iceAreaKm2"] or 0) * 100, 1),
            "cloudCover": doc["frames"][-1]["stats"].get("cloud_fraction", 0),
        }
        if last
        else None,
        "attribution": ATTRIBUTION,
        "retrievedAt": (now or datetime.now(timezone.utc)).isoformat(),
    }


def publish_lake(store: Store, doc: dict[str, Any]) -> str:
    pub = build_public(doc)
    return store.save(f"public/{doc['lake']['id']}", pub)


def publish_index(store: Store, docs: list[dict[str, Any]]) -> str:
    return store.save(
        "public/lakes",
        [
            {
                "id": d["lake"]["id"],
                "name": d["lake"]["name"],
                "country": d["lake"]["country"],
                "center": d["lake"]["center"],
                "elevationM": d["lake"]["lake_elevation_m"],
            }
            for d in docs
        ],
    )
