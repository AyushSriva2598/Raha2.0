"""Multi-year boundary archive: one water + ice outline per clear acquisition.

Per lake: STAC search per open-water season -> one scene per date (least cloudy tile) -> cheap SCL-only
cloud screen -> NDWI water + NDSI ice extraction -> "the lake" = water polygon at the seed point ->
thinning (a frame every min_gap_days or whenever the area jumps).

Every frame is a real Sentinel-2 L2A observation; nothing is interpolated here.
"""
from __future__ import annotations

import logging
import statistics
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable

import numpy as np
from rasterio.enums import Resampling

from .boundary import frozen_fraction
from .config import Lake, Settings
from .extract import WaterParams, extract_water
from .raster import SCL_CLOUD_SHADOW, GeospatialError, read_band_window
from .stac import SceneRef, StacSceneFinder
from .vectorize import select_lake

log = logging.getLogger(__name__)
SCHEMA = 2
READ_ATTEMPTS = 3  # transient network failures are retried; a deterministic skip is not
MIN_CONTEXT_WATER_M2 = 10_000  # other lakes nearby (>= 1 ha) kept for context


def in_season(d: date, season: tuple[str, str]) -> bool:
    md = d.strftime("%m-%d")
    return season[0] <= md <= season[1]


def thin_frames(frames: list[dict[str, Any]], min_gap_days: int, jump_pct: float = 8.0) -> list[dict[str, Any]]:
    """Keep a frame when min_gap_days have passed or the lake area jumped. Frames must be date-sorted.
    Sudden changes (a drainage) and the newest frame are never thinned away."""
    kept: list[dict[str, Any]] = []
    for f in frames:
        if not kept:
            kept.append(f)
            continue
        last = kept[-1]
        gap = (date.fromisoformat(f["date"]) - date.fromisoformat(last["date"])).days
        a0, a1 = last["stats"]["lake_area_m2"], f["stats"]["lake_area_m2"]
        jump = abs(a1 - a0) / a0 * 100 if a0 else 100.0
        if gap >= min_gap_days or jump >= jump_pct:
            kept.append(f)
    # The newest observation is never thinned away: a monitor must evaluate the latest scene, and
    # dropping it could delay an escalation by up to min_gap_days.
    if frames and kept[-1] is not frames[-1]:
        kept.append(frames[-1])
    return kept


def drop_outliers(frames: list[dict[str, Any]], low: float = 0.6, high: float = 1.6) -> list[dict[str, Any]]:
    """Drop scenes whose lake extent is wildly off the archive median: shadow, fresh snow or lake ice
    misread by NDWI. A real drainage that persists over several scenes is handled by the risk engine."""
    if len(frames) < 5:
        return frames
    med = statistics.median(f["stats"]["lake_area_m2"] for f in frames)
    return [f for f in frames if low * med <= f["stats"]["lake_area_m2"] <= high * med]


class ArchiveBuilder:
    def __init__(self, settings: Settings, finder: StacSceneFinder) -> None:
        self._s = settings
        self._finder = finder
        # Scenes that could not be READ (network), as opposed to cloudy or unusable ones. A non-empty
        # list means the archive may be missing observations and callers must say so.
        self.errors: list[str] = []

    def _params(self) -> WaterParams:
        s = self._s
        return WaterParams(
            ndwi_threshold=s.ndwi_threshold,
            max_nir_reflectance=s.max_nir_reflectance,
            min_polygon_area_m2=s.min_polygon_area_m2,
            simplify_tolerance_m=s.simplify_tolerance_m,
        )

    def candidates(self, lake: Lake, start: datetime, end: datetime, per_month: int = 4) -> list[SceneRef]:
        """One search per season (a single multi-year search pages slowly and was seen to drop later years).
        Keeps the per_month least-cloudy scenes so short clear windows survive."""
        season = self._s.season_window
        out: list[SceneRef] = []
        for year in range(start.year, end.year + 1):
            a = max(start, datetime.fromisoformat(f"{year}-{season[0]}").replace(tzinfo=timezone.utc))
            b = min(end, datetime.fromisoformat(f"{year}-{season[1]}T23:59:59").replace(tzinfo=timezone.utc))
            if a >= b:
                continue
            scenes = self._finder.find_scenes_between(lake.bbox, a, b, max_tile_cloud=40.0, limit=300)
            by_month: dict[int, list[SceneRef]] = {}
            for sc in sorted(scenes, key=lambda sc: sc.tile_cloud_cover or 0):
                by_month.setdefault(sc.acquired.month, []).append(sc)
            out.extend(sc for lst in by_month.values() for sc in lst[:per_month])
        return sorted(out, key=lambda sc: sc.acquired)

    def analyse(self, lake: Lake, scene: SceneRef) -> dict[str, Any] | None:
        """One frame, or None if the scene is cloudy / unusable over the lake window."""
        if not scene.scl_href or not scene.swir:
            return None
        green = read_band_window(scene.green.href, lake.bbox)
        scl = read_band_window(scene.scl_href, lake.bbox, like=green)
        cloud = float(np.isin(scl.data, SCL_CLOUD_SHADOW).mean())
        if cloud > self._s.archive_max_cloud_fraction:
            return None
        nir = read_band_window(scene.nir.href, lake.bbox, like=green)
        swir = read_band_window(scene.swir.href, lake.bbox, like=green, resampling=Resampling.bilinear)
        ex = extract_water(
            green, nir, scl,
            green_cal=(scene.green.scale, scene.green.offset),
            nir_cal=(scene.nir.scale, scene.nir.offset),
            params=self._params(),
            swir=swir, swir_cal=(scene.swir.scale, scene.swir.offset),
        )
        if ex.stats["valid_fraction"] < self._s.min_valid_fraction:
            return None
        lake_feat = select_lake(ex.feature_collection, lake.seed_point)
        if lake_feat is None:
            return None
        others = [
            f for f in ex.feature_collection["features"]
            if not f["properties"]["primary"] and f["properties"]["area_m2"] >= MIN_CONTEXT_WATER_M2
        ]
        return {
            "date": scene.acquired.date().isoformat(),
            "acquired": scene.acquired.isoformat(),
            "scene": scene.item_id,
            "stats": {
                "lake_area_m2": lake_feat["properties"]["area_m2"],
                "water_area_m2": ex.stats["water_area_m2"],
                "ice_area_m2": ex.stats["ice_area_m2"],
                "cloud_fraction": round(cloud, 4),
                "mean_ndwi": lake_feat["properties"].get("mean_ndwi"),
            },
            "lake": {"type": "Feature", "properties": {"kind": "lake"}, "geometry": lake_feat["geometry"]},
            "water": {"type": "FeatureCollection", "features": others},
            "ice": ex.ice_collection,
        }

    def _analyse_safe(self, lake: Lake, scene: SceneRef) -> dict[str, Any] | None:
        for attempt in range(READ_ATTEMPTS):
            try:
                return self.analyse(lake, scene)
            except GeospatialError as exc:  # deterministic (tile edge, no overlap): retrying cannot help
                log.info("skip %s: %s", scene.item_id, exc)
                return None
            except Exception as exc:
                if "does not exist" in str(exc):  # the catalog lists a file the bucket does not hold: permanent
                    log.info("skip %s: asset missing from the bucket", scene.item_id)
                    return None  # a network blip on one COG must not sink a multi-year build
                log.warning("read failed for %s (attempt %d/%d): %s", scene.item_id, attempt + 1, READ_ATTEMPTS, exc)
                if attempt + 1 < READ_ATTEMPTS:
                    time.sleep(2 * (attempt + 1))
        self.errors.append(scene.item_id)
        return None

    def build_frames(
        self, lake: Lake, start: datetime, end: datetime, *, workers: int = 8,
        progress: Callable[[int, int, dict | None], None] | None = None,
    ) -> list[dict[str, Any]]:
        scenes = self.candidates(lake, start, end)
        self.errors = []
        out: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for i, fr in enumerate(pool.map(lambda sc: self._analyse_safe(lake, sc), scenes)):
                if fr:
                    out.append(fr)
                if progress:
                    progress(i + 1, len(scenes), fr)
        out.sort(key=lambda f: f["date"])
        return out

    def finalise(self, lake: Lake, frames: list[dict[str, Any]]) -> list[dict[str, Any]]:
        frames = thin_frames(drop_outliers(sorted(frames, key=lambda f: f["date"])), self._s.archive_min_gap_days)
        prev = None
        for f in frames:  # share of the last lake footprint now ice/snow (freeze guard)
            f["stats"]["frozen_fraction"] = frozen_fraction(
                prev["lake"]["geometry"] if prev else None, f["ice"], lake.utm_epsg
            )
            prev = f
        return frames

    def document(self, lake: Lake, frames: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "schema": SCHEMA,
            "lake": lake.summary(),
            "source": "Sentinel-2 L2A (ESA Copernicus) via AWS Earth Search STAC, COGs on AWS Open Data",
            "collection": self._s.stac_collection,
            "method": {
                "water": f"NDWI > {self._s.ndwi_threshold} and NIR <= {self._s.max_nir_reflectance}, SCL cloud mask",
                "ice": "NDSI > 0.4 and NIR >= 0.11 (snow and clean ice; debris-covered ice not detected)",
                "season": self._s.archive_season,
                "max_cloud_fraction": self._s.archive_max_cloud_fraction,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "frames": frames,
        }

    def build(self, lake: Lake, start: datetime | None = None, end: datetime | None = None, **kw) -> dict[str, Any]:
        start = start or datetime.fromisoformat(self._s.archive_start).replace(tzinfo=timezone.utc)
        end = end or datetime.now(timezone.utc)
        return self.document(lake, self.finalise(lake, self.build_frames(lake, start, end, **kw)))

    def update(
        self, lake: Lake, doc: dict[str, Any] | None, *, now: datetime | None = None
    ) -> tuple[dict[str, Any], list[dict]]:
        """Incremental refresh (what the scheduled Lambda runs): scenes newer than the last frame are
        analysed and appended. Returns (doc, new_frames)."""
        now = now or datetime.now(timezone.utc)
        if not doc or not doc.get("frames"):
            doc = self.build(lake, end=now)
            return doc, doc["frames"]
        last = date.fromisoformat(doc["frames"][-1]["date"])
        start = datetime.combine(last + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
        fresh = self.build_frames(lake, start, now) if start < now else []
        known = {f["date"] for f in doc["frames"]}
        fresh = [f for f in fresh if f["date"] not in known]
        if fresh:
            frames = self.finalise(lake, doc["frames"] + fresh)
            new_dates = {f["date"] for f in fresh}
            fresh = [f for f in frames if f["date"] in new_dates]
            doc = self.document(lake, frames)
        return doc, fresh
