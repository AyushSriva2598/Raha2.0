# Glacial lake pipeline

Turns Sentinel-2 satellite imagery into lake outlines, a risk timeline and the JSON the Raha app shows on its 3D lake screen. It runs locally, or on AWS as a scheduled Lambda (see `infra/`).

Adapted from the team's GLOoF project (github.com/Gravyie/GLOoF). Changes: `geopandas` replaced by `shapely` + `pyproj` so the package fits a plain Lambda zip, the alerting code split out (this package only reports escalations), published JSON slimmed to what the app reads, and tests for the alert safety rules.

## How it works

1. **Discover** scenes: Earth Search STAC (`sentinel-2-l2a`), one search per open-water season (1 Jun to 5 Nov), scenes whose footprint fully covers a ~5 x 5 km window around the lake.
2. **Read** only that window from the Cloud Optimised GeoTIFFs (HTTP range requests on AWS Open Data, no credentials): green, NIR, SWIR and the scene classification band. Reflectance uses the scale and offset published in the STAC metadata.
3. **Extract**: water = NDWI > 0.1 and NIR <= 0.20 (the NIR guard rejects fresh snow); ice = NDSI > 0.4 and NIR >= 0.11; cloud, shadow and cirrus masked with SCL. Polygons are simplified in metres (UTM) and reprojected to WGS84. "The lake" is the polygon at a seed point, not the largest one.
4. **Select frames**: cloud screen, drop scenes whose area is far from the archive median (shadow, snow, lake ice), thin to about one per 8 days. The newest scene is never thinned away.
5. **Risk timeline** (`history.py`): each frame is evaluated using only earlier frames. Indicators: growth versus the first-season baseline, shoreline advance, two-year trend, sudden drainage (with a freeze guard). A hysteresis tracker stops flapping; WARNING and EVACUATE are never cleared automatically.
6. **Publish** (`publish.py`): `public/<lake>.json` (what the app reads, matches `GlofLakeData` in `frontend/src/types`) and `public/lakes.json`.

The risk thresholds are round-number placeholders. They must be calibrated with the disaster-management authority before anyone relies on them. Nothing here is an official warning.

## Use

```bash
cd pipeline
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt

PYTHONPATH=src DATA_DIR=out .venv/bin/python -m glof.cli build   --lake south_lhonak   # full build, about 10 minutes
PYTHONPATH=src DATA_DIR=out .venv/bin/python -m glof.cli update  --lake south_lhonak   # only scenes newer than the archive
PYTHONPATH=src DATA_DIR=out .venv/bin/python -m glof.cli publish                       # rebuild public/*.json from stored archives
```

Results go to `DATA_DIR` (default `out/`) or to the S3 bucket named by `DATA_BUCKET`. The Raha backend reads `public/*.json` from `GLOF_DATA_DIR` (default `../pipeline/out`).

## Tests

```bash
PYTHONPATH=src .venv/bin/python -m pytest -q                 # 25 fast tests, no network
PYTHONPATH=src .venv/bin/python -m pytest -m regression -q   # fresh build vs the GLOoF reference archive (network)
```

The fast tests cover water and ice extraction (on synthetic rasters read through the same code path as a real COG), boundary maths, thinning and outliers, the risk timeline (no look-ahead, drainage, never auto-clearing WARNING), the published contract, and the ingest handler's alert safety rules.

## Scheduled ingest (`glof.handler`)

Daily: update each archive, re-publish, and report an escalation as an EventBridge event (`raha.glof` / `LakeEscalated`). It never sends a message itself. Rules: first sight of a lake only records its level (history never alerts), each level is announced once, only scenes from the last `ALERT_MAX_AGE_DAYS` (14) can alert, and `{"force_level": "WARNING"}` produces a clearly marked drill.

## Limits

- Imagery on Earth Search starts in December 2017 for this region.
- Lake area varies by about 10% scene to scene (topographic shadow, icebergs, fresh snow).
- The 2023 outburst shrank the lake's footprint by only about 14%, so drainage is detected through the shoreline shift, not area alone.
- Sentinel-2 revisits every few days: this shows trends, not minute-by-minute warnings.
- Debris-covered ice is not detected.
