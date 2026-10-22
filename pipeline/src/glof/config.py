"""Settings (environment driven) and the registry of monitored lakes.

Lake *locations* are static configuration (where to look); the water geometry is never typed in,
it is always derived from satellite pixels.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache


@dataclass(frozen=True)
class Lake:
    id: str
    name: str
    country: str
    center: tuple[float, float]  # (lon, lat), WGS84
    half_size_deg: float  # half-width of the analysis window
    lake_elevation_m: float
    # A point inside the lake: the water polygon containing (or nearest to) it is "the lake".
    seed: tuple[float, float] | None = None
    utm_epsg: int = 32645  # metric CRS for boundary maths
    # Documented real-world events shown on the timeline (facts, not model output).
    events: tuple[dict, ...] = field(default_factory=tuple)

    @property
    def seed_point(self) -> tuple[float, float]:
        return self.seed or self.center

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        """(west, south, east, north) in WGS84."""
        lon, lat = self.center
        h = self.half_size_deg
        return (round(lon - h, 6), round(lat - h, 6), round(lon + h, 6), round(lat + h, 6))

    def summary(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "country": self.country,
            "center": list(self.center),
            "bbox": list(self.bbox),
            "lake_elevation_m": self.lake_elevation_m,
            "utm_epsg": self.utm_epsg,
            "seed": list(self.seed_point),
            "events": list(self.events),
        }


LAKES: dict[str, Lake] = {
    "south_lhonak": Lake(
        id="south_lhonak",
        name="South Lhonak Lake",
        country="India (Sikkim)",
        # Centre verified against Sentinel-2 imagery: the window covers the whole lake including
        # the eastern (outlet / moraine) end that failed in 2023.
        center=(88.196, 27.911),
        half_size_deg=0.025,
        lake_elevation_m=5200,
        seed=(88.196, 27.9115),
        utm_epsg=32645,
        events=(
            {
                "date": "2023-10-04",
                "label": "Outburst flood (GLOF)",
                "detail": "Moraine-dammed lake breached on the night of 3-4 Oct 2023; the flood travelled down "
                "the Teesta valley and destroyed the Chungthang dam.",
            },
        ),
    ),
    "imja_tsho": Lake(
        id="imja_tsho",
        name="Imja Tsho",
        country="Nepal (Khumbu)",
        center=(86.9278, 27.8997),
        half_size_deg=0.025,
        lake_elevation_m=5010,
        utm_epsg=32645,
    ),
}


def _f(name: str, default: float) -> float:
    return float(os.environ.get(name, default))


@dataclass(frozen=True)
class Settings:
    # STAC (AWS Open Data, no credentials needed)
    stac_url: str = "https://earth-search.aws.element84.com/v1"
    stac_collection: str = "sentinel-2-l2a"

    # Water extraction
    ndwi_threshold: float = 0.1
    # Snow has high NIR reflectance, water does not: without this guard NDWI > 0.1 picks up fresh snow.
    max_nir_reflectance: float = 0.20
    min_valid_fraction: float = 0.90
    min_polygon_area_m2: float = 2000.0  # drop speckle (< 20 px at 10 m)
    simplify_tolerance_m: float = 5.0

    # Boundary archive
    archive_start: str = "2017-12-01"  # first Sentinel-2 L2A scenes over the Himalaya on Earth Search
    # MM-DD open-water season. Ends early November: later, low sun casts long shadows and the lake
    # starts to freeze, both of which NDWI misreads.
    archive_season: str = "06-01,11-05"
    archive_min_gap_days: int = 8
    archive_max_cloud_fraction: float = 0.08

    # Where results live: a local directory, or an S3 bucket when DATA_BUCKET is set.
    data_dir: str = "out"
    data_bucket: str | None = None
    aws_region: str = "ap-south-1"

    @property
    def season_window(self) -> tuple[str, str]:
        a, b = (p.strip() for p in self.archive_season.split(","))
        return a, b


@lru_cache
def get_settings() -> Settings:
    return Settings(
        stac_url=os.environ.get("STAC_URL", Settings.stac_url),
        ndwi_threshold=_f("NDWI_THRESHOLD", Settings.ndwi_threshold),
        max_nir_reflectance=_f("MAX_NIR_REFLECTANCE", Settings.max_nir_reflectance),
        archive_season=os.environ.get("ARCHIVE_SEASON", Settings.archive_season),
        data_dir=os.environ.get("DATA_DIR", Settings.data_dir),
        data_bucket=os.environ.get("DATA_BUCKET") or None,
        aws_region=os.environ.get("AWS_REGION", Settings.aws_region),
    )
