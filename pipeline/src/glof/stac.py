"""AWS Earth Search (Element 84) STAC queries for Sentinel-2 L2A.

Only *finds* scenes and resolves the assets we need; it never touches pixels (see raster.py).
Earth Search v1 asset keys: green (B03), nir (B08), swir16 (B11), scl (scene classification).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

from pystac import Asset, Item
from pystac_client import Client
from shapely.geometry import box, shape

from .config import Settings

log = logging.getLogger(__name__)

_ALIASES = {
    "green": ("green", "B03"),
    "nir": ("nir", "B08"),
    "scl": ("scl", "SCL"),
    "swir": ("swir16", "B11"),
}


class StacError(RuntimeError):
    """The catalog could not be queried or returned an unusable item."""


@dataclass(frozen=True)
class BandAsset:
    href: str
    scale: float  # reflectance = DN * scale + offset
    offset: float


@dataclass(frozen=True)
class SceneRef:
    item_id: str
    acquired: datetime
    tile_cloud_cover: float | None
    green: BandAsset
    nir: BandAsset
    scl_href: str | None
    swir: BandAsset | None = None


def _find_asset(item: Item, key: str) -> Asset | None:
    for name in _ALIASES[key]:
        if name in item.assets:
            return item.assets[name]
    return None


def _band_asset(item: Item, asset: Asset) -> BandAsset:
    """Read scale/offset from the STAC raster:bands metadata.

    Since processing baseline 04.00 (Jan 2022) L2A DNs carry a -1000 offset; ignoring it biases NDWI.
    """
    meta = (asset.extra_fields.get("raster:bands") or [{}])[0]
    scale, offset = meta.get("scale"), meta.get("offset")
    if scale is None or offset is None:
        baseline = str(item.properties.get("s2:processing_baseline", "0"))
        try:
            new_baseline = float(baseline) >= 4.0
        except ValueError:
            new_baseline = False
        scale = 1e-4 if scale is None else scale
        offset = (-0.1 if new_baseline else 0.0) if offset is None else offset
    return BandAsset(href=asset.href, scale=float(scale), offset=float(offset))


def _to_scene(item: Item) -> SceneRef:
    green, nir = _find_asset(item, "green"), _find_asset(item, "nir")
    if green is None or nir is None:
        raise StacError(f"{item.id}: missing green/nir assets")
    scl, swir = _find_asset(item, "scl"), _find_asset(item, "swir")
    if item.datetime is None:
        raise StacError(f"{item.id}: item has no datetime")
    return SceneRef(
        item_id=item.id,
        acquired=item.datetime,
        tile_cloud_cover=item.properties.get("eo:cloud_cover"),
        green=_band_asset(item, green),
        nir=_band_asset(item, nir),
        scl_href=scl.href if scl else None,
        swir=_band_asset(item, swir) if swir else None,
    )


def covers(item: Item, bbox: tuple[float, float, float, float]) -> bool:
    """True if the item's footprint contains the whole bbox.

    Sentinel-2 tiles overlap; on a tile edge the window would be clipped and silently analysed as a strip.
    """
    if not item.geometry:
        return True
    try:
        return shape(item.geometry).buffer(1e-9).contains(box(*bbox))
    except Exception:  # malformed footprint: let the pixel reader decide
        return True


def _dedupe_by_date(scenes: list[SceneRef]) -> list[SceneRef]:
    """Overlapping tiles / reprocessings duplicate an acquisition. Keep the least cloudy."""
    best: dict[str, SceneRef] = {}
    for sc in scenes:
        d = sc.acquired.date().isoformat()
        cur = best.get(d)
        if cur is None or (sc.tile_cloud_cover or 0) < (cur.tile_cloud_cover or 0):
            best[d] = sc
    return list(best.values())


class StacSceneFinder:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Client | None = None

    def _get_client(self) -> Client:
        if self._client is None:
            try:
                self._client = Client.open(self._settings.stac_url)
            except Exception as exc:  # network, DNS, bad JSON
                raise StacError(f"cannot open STAC catalog: {exc}") from exc
        return self._client

    def find_scenes_between(
        self,
        bbox: tuple[float, float, float, float],
        start: datetime,
        end: datetime,
        *,
        max_tile_cloud: float = 60.0,
        limit: int = 500,
    ) -> list[SceneRef]:
        """All scenes fully covering bbox in [start, end], one per date, newest first."""
        try:
            search = self._get_client().search(
                collections=[self._settings.stac_collection],
                bbox=list(bbox),
                datetime=f"{start.isoformat()}/{end.isoformat()}",
                query={"eo:cloud_cover": {"lt": max_tile_cloud}},
                sortby="-properties.datetime",
                max_items=limit,
            )
            items = list(search.items())
        except StacError:
            raise
        except Exception as exc:
            raise StacError(f"STAC search failed: {exc}") from exc
        return self._convert(items, bbox)

    def _convert(self, items: list[Item], bbox: tuple[float, float, float, float]) -> list[SceneRef]:
        scenes: list[SceneRef] = []
        for item in items:
            if not covers(item, bbox):
                continue
            try:
                scenes.append(_to_scene(item))
            except StacError as exc:
                log.warning("skipping item: %s", exc)
        scenes = _dedupe_by_date(scenes)
        scenes.sort(key=lambda sc: sc.acquired, reverse=True)
        return scenes
