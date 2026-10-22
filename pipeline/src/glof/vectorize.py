"""Boolean raster mask -> GeoJSON polygons (EPSG:4326), using only shapely + pyproj (no geopandas)."""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import shapely
from pyproj import Transformer
from rasterio import features
from rasterio.crs import CRS
from rasterio.transform import Affine
from shapely.geometry import Point, mapping, shape

from .raster import GeospatialError


def vectorize_mask(
    mask: np.ndarray,
    index: np.ndarray,
    transform: Affine,
    crs: CRS,
    *,
    kind: str,
    index_name: str,
    min_area_m2: float,
    simplify_m: float,
) -> list[dict[str, Any]]:
    """Polygonize a boolean mask; the largest polygon comes first. Areas are measured in the (UTM) raster CRS."""
    if not crs.is_projected:
        raise GeospatialError("raster CRS must be projected (metres) for area maths")
    if not mask.any():
        return []

    polys = [
        shape(geom)
        for geom, value in features.shapes(mask.astype(np.uint8), mask=mask, transform=transform, connectivity=8)
        if value == 1
    ]
    polys = [p for p in polys if p.area >= min_area_m2]
    polys.sort(key=lambda p: p.area, reverse=True)
    if not polys:
        return []

    to_wgs84 = Transformer.from_crs(crs.to_wkt(), 4326, always_xy=True).transform
    out: list[dict[str, Any]] = []
    for idx, poly in enumerate(polys):
        inside = features.geometry_mask([mapping(poly)], out_shape=mask.shape, transform=transform, invert=True)
        vals = index[inside & mask]
        mean = float(np.nanmean(vals)) if vals.size else float("nan")
        simple = poly.simplify(simplify_m, preserve_topology=True) if simplify_m > 0 else poly
        geom = shapely.set_precision(shapely.transform(simple, lambda x, y: to_wgs84(x, y), interleaved=False), 1e-6)  # ~0.1 m, keeps JSON small
        out.append(
            {
                "type": "Feature",
                "id": idx,
                "properties": {
                    "kind": kind,
                    "area_m2": round(float(poly.area), 1),
                    "area_ha": round(float(poly.area) / 1e4, 3),
                    f"mean_{index_name}": None if math.isnan(mean) else round(mean, 3),
                    "primary": idx == 0,  # largest body
                },
                "geometry": mapping(geom),
            }
        )
    return out


def select_lake(fc: dict[str, Any], seed: tuple[float, float], max_dist_deg: float = 0.005) -> dict[str, Any] | None:
    """The water feature that is "the lake": the polygon containing the seed point, else the nearest one
    within max_dist_deg (~500 m), else None. "Largest polygon" is fragile when a neighbouring lake is bigger.
    Sets properties.primary accordingly on every feature (in place)."""
    pt = Point(seed)
    best, best_d = None, max_dist_deg
    for f in fc.get("features", []):
        f["properties"]["primary"] = False
        d = shape(f["geometry"]).distance(pt)
        if d < best_d or (d == 0 and best is not None and f["properties"]["area_m2"] > best["properties"]["area_m2"]):
            best, best_d = f, d
    if best is not None:
        best["properties"]["primary"] = True
    return best
