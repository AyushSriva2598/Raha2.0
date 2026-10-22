"""Reading Sentinel-2 COG windows into memory, and the spectral indices (NDWI, NDSI).

Only the analysis window around the lake is read (HTTP range requests on the COG), never the whole
110 x 110 km tile.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine, array_bounds
from rasterio.warp import transform_bounds
from rasterio.windows import Window, from_bounds

# GDAL settings for anonymous, efficient COG access on public S3.
GDAL_ENV = {
    "AWS_NO_SIGN_REQUEST": "YES",
    "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.tiff",
    "GDAL_HTTP_MAX_RETRY": "3",
    "GDAL_HTTP_RETRY_DELAY": "1",
    # A hung range read must fail (and the scene be skipped), not stall a whole build or burn a
    # Lambda's 15-minute budget.
    "GDAL_HTTP_CONNECTTIMEOUT": "30",
    "GDAL_HTTP_TIMEOUT": "120",
    "VSI_CACHE": "TRUE",
}

# Sentinel-2 SCL classes: 3 cloud shadow, 8/9 cloud (medium/high), 10 thin cirrus, 11 snow/ice
SCL_CLOUD_SHADOW = (3, 8, 9, 10)
SCL_SNOW = 11


class GeospatialError(RuntimeError):
    pass


@dataclass(frozen=True)
class BandWindow:
    data: np.ndarray
    transform: Affine
    crs: CRS


def read_band_window(
    href: str,
    bbox_wgs84: tuple[float, float, float, float],
    *,
    like: BandWindow | None = None,
    resampling: Resampling = Resampling.nearest,
) -> BandWindow:
    """Read the part of a COG covering bbox_wgs84 into a numpy array.

    like=None: pixel-aligned window in the band's native grid.
    like=<BandWindow>: the same ground footprint, resampled onto that grid (used to align the 20 m
    SCL/SWIR bands to the 10 m bands).
    """
    with rasterio.Env(**GDAL_ENV):
        with rasterio.open(href) as src:
            if like is None:
                native = transform_bounds("EPSG:4326", src.crs, *bbox_wgs84, densify_pts=21)
                win = from_bounds(*native, transform=src.transform)
                col0, row0 = math.floor(win.col_off), math.floor(win.row_off)
                col1, row1 = math.ceil(win.col_off + win.width), math.ceil(win.row_off + win.height)
                win = Window(col0, row0, col1 - col0, row1 - row0)
                wanted = win.width * win.height
                try:
                    win = win.intersection(Window(0, 0, src.width, src.height))
                except Exception as exc:  # rasterio.errors.WindowError
                    raise GeospatialError("window does not intersect raster") from exc
                # A window hanging off the tile edge would be analysed as a strip.
                if win.width * win.height < 0.98 * wanted:
                    raise GeospatialError("analysis window extends past the tile edge")
                data = src.read(1, window=win)
                return BandWindow(data, src.window_transform(win), src.crs)

            if src.crs != like.crs:
                raise GeospatialError(f"CRS mismatch: {src.crs} vs {like.crs}")
            h, w = like.data.shape
            west, south, east, north = array_bounds(h, w, like.transform)
            win = from_bounds(west, south, east, north, transform=src.transform)
            data = src.read(1, window=win, out_shape=(h, w), resampling=resampling)
            return BandWindow(data, like.transform, like.crs)


def to_reflectance(dn: np.ndarray, scale: float, offset: float) -> np.ndarray:
    """DN -> surface reflectance. DN == 0 is Sentinel-2 nodata -> NaN."""
    refl = dn.astype(np.float32) * np.float32(scale) + np.float32(offset)
    refl = np.clip(refl, 0.0, None)
    refl[dn == 0] = np.nan
    return refl


def normalized_difference(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """(a - b) / (a + b); NaN where undefined. NDWI uses (green, nir), NDSI uses (green, swir)."""
    with np.errstate(invalid="ignore", divide="ignore"):
        out = (a - b) / (a + b)
    out[~np.isfinite(out)] = np.nan
    return out.astype(np.float32)
