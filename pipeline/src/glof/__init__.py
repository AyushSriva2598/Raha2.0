"""Glacial lake monitor pipeline: Sentinel-2 imagery -> lake outlines -> risk timeline -> published JSON.

Adapted from the team's GLOoF project (Gravyie/GLOoF), with geopandas replaced by shapely + pyproj so
the whole package fits in a plain AWS Lambda zip.
"""
