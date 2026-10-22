"""Water (NDWI) and snow/ice (NDSI) extraction from Sentinel-2 band windows.

    DN -> reflectance (scale + offset from STAC) -> NDWI = (G - NIR) / (G + NIR)
       -> water = clear sky, NDWI > threshold, NIR below snow level
       -> polygons in EPSG:4326
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from .raster import SCL_CLOUD_SHADOW, SCL_SNOW, BandWindow, GeospatialError, normalized_difference, to_reflectance
from .vectorize import vectorize_mask


@dataclass(frozen=True)
class WaterParams:
    ndwi_threshold: float = 0.1
    max_nir_reflectance: float = 0.20
    min_polygon_area_m2: float = 2000.0
    simplify_tolerance_m: float = 5.0
    exclude_snow: bool = False
    # Snow/ice (NDSI = (Green - SWIR) / (Green + SWIR)). The NIR floor stops dark water being classed as snow.
    ndsi_threshold: float = 0.4
    min_ice_nir_reflectance: float = 0.11
    min_ice_area_m2: float = 20000.0
    ice_simplify_tolerance_m: float = 15.0


@dataclass(frozen=True)
class WaterExtraction:
    feature_collection: dict[str, Any]
    stats: dict[str, Any]
    ice_collection: dict[str, Any] | None = None


def _fc(feats: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": feats}


def extract_water(
    green: BandWindow,
    nir: BandWindow,
    scl: BandWindow | None,
    *,
    green_cal: tuple[float, float],
    nir_cal: tuple[float, float],
    params: WaterParams,
    swir: BandWindow | None = None,
    swir_cal: tuple[float, float] | None = None,
) -> WaterExtraction:
    if green.data.shape != nir.data.shape or green.transform != nir.transform:
        raise GeospatialError("green and NIR windows are not on the same grid")

    g = to_reflectance(green.data, *green_cal)
    n = to_reflectance(nir.data, *nir_cal)
    ndwi = normalized_difference(g, n)
    valid = np.isfinite(ndwi)

    bad = np.zeros(valid.shape, dtype=bool)
    if scl is not None:
        classes = SCL_CLOUD_SHADOW + ((SCL_SNOW,) if params.exclude_snow else ())
        bad = np.isin(scl.data, classes)
    clear = valid & ~bad

    with np.errstate(invalid="ignore"):
        water = clear & (ndwi > params.ndwi_threshold) & (n <= params.max_nir_reflectance)

    water_feats = vectorize_mask(
        water, ndwi, green.transform, green.crs,
        kind="water", index_name="ndwi",
        min_area_m2=params.min_polygon_area_m2, simplify_m=params.simplify_tolerance_m,
    )

    ice_feats: list[dict[str, Any]] | None = None
    ice_total = 0.0
    if swir is not None and swir_cal is not None:
        if swir.data.shape != green.data.shape:
            raise GeospatialError("SWIR window is not on the green/NIR grid")
        sw = to_reflectance(swir.data, *swir_cal)
        ndsi = normalized_difference(g, sw)
        with np.errstate(invalid="ignore"):
            ice = clear & ~water & (ndsi > params.ndsi_threshold) & (n >= params.min_ice_nir_reflectance)
        ice_feats = vectorize_mask(
            ice, ndsi, green.transform, green.crs,
            kind="ice", index_name="ndsi",
            min_area_m2=params.min_ice_area_m2, simplify_m=params.ice_simplify_tolerance_m,
        )
        ice_total = float(sum(f["properties"]["area_m2"] for f in ice_feats))

    total_area = float(sum(f["properties"]["area_m2"] for f in water_feats))
    stats = {
        "water_area_m2": round(total_area, 1),
        "water_area_ha": round(total_area / 1e4, 3),
        "primary_area_m2": water_feats[0]["properties"]["area_m2"] if water_feats else 0.0,
        "polygon_count": len(water_feats),
        "ice_area_m2": round(ice_total, 1) if ice_feats is not None else None,
        "ice_area_ha": round(ice_total / 1e4, 2) if ice_feats is not None else None,
        "ice_polygon_count": len(ice_feats) if ice_feats is not None else None,
        "pixel_size_m": abs(green.transform.a),
        "window_shape": list(valid.shape),
        "valid_fraction": round(float(valid.mean()), 4),
        "cloud_fraction": round(float(bad.mean()), 4),
        "crs": str(green.crs),
    }
    return WaterExtraction(
        feature_collection=_fc(water_feats),
        stats=stats,
        ice_collection=_fc(ice_feats) if ice_feats is not None else None,
    )
