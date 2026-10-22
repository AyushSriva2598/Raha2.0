"""JSON document store with one interface for a local directory and an S3 bucket.

Keys look like "archive/south_lhonak" and map to "<key>.json" under the data dir, or in the bucket.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .config import Settings


class Store:
    describe: str = ""

    def load(self, key: str) -> dict[str, Any] | None:
        raise NotImplementedError

    def save(self, key: str, doc: Any) -> str:
        raise NotImplementedError


class LocalStore(Store):
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)
        self.describe = f"local:{self.root}"

    def _path(self, key: str) -> Path:
        return self.root / f"{key}.json"

    def load(self, key: str) -> dict[str, Any] | None:
        p = self._path(key)
        return json.loads(p.read_text()) if p.exists() else None

    def save(self, key: str, doc: Any) -> str:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(doc, separators=(",", ":")))
        tmp.replace(p)
        return str(p)


class S3Store(Store):
    def __init__(self, bucket: str, region: str | None = None, client: Any = None) -> None:
        import boto3

        self.bucket = bucket
        self._s3 = client or boto3.client("s3", region_name=region)
        self.describe = f"s3://{bucket}/"

    def load(self, key: str) -> dict[str, Any] | None:
        try:
            obj = self._s3.get_object(Bucket=self.bucket, Key=f"{key}.json")
        except self._s3.exceptions.NoSuchKey:
            return None
        return json.loads(obj["Body"].read())

    def save(self, key: str, doc: Any) -> str:
        kwargs: dict[str, Any] = {}
        if key.startswith("public/"):
            kwargs["CacheControl"] = "public, max-age=300"  # served to the app through the API
        self._s3.put_object(
            Bucket=self.bucket,
            Key=f"{key}.json",
            Body=json.dumps(doc, separators=(",", ":")).encode(),
            ContentType="application/json",
            **kwargs,
        )
        return f"s3://{self.bucket}/{key}.json"


def make_store(settings: Settings) -> Store:
    if settings.data_bucket:
        return S3Store(settings.data_bucket, settings.aws_region)
    return LocalStore(settings.data_dir)
