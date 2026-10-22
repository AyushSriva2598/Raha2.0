"""Command line: build / update / publish lake archives.

    python -m glof.cli build   --lake south_lhonak          # full multi-year build (minutes)
    python -m glof.cli update  --lake south_lhonak          # append scenes newer than the stored archive
    python -m glof.cli publish                              # rebuild public/*.json from stored archives

Results go to DATA_DIR (default ./out) or to the S3 bucket named by DATA_BUCKET.
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from datetime import datetime, timezone

from .archive import ArchiveBuilder
from .config import LAKES, get_settings
from .publish import publish_index, publish_lake
from .stac import StacSceneFinder
from .store import make_store


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="glof")
    ap.add_argument("command", choices=["build", "update", "publish"])
    ap.add_argument("--lake", choices=sorted(LAKES), help="default: every lake")
    ap.add_argument("--start", help="ISO date (default ARCHIVE_START)")
    ap.add_argument("--end", help="ISO date (default now)")
    ap.add_argument("--workers", type=int, default=8)
    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.WARNING)

    s = get_settings()
    store = make_store(s)
    builder = ArchiveBuilder(s, StacSceneFinder(s))
    lakes = [LAKES[a.lake]] if a.lake else list(LAKES.values())
    t0 = time.time()
    docs: list[dict] = []

    def progress(i: int, n: int, fr: dict | None) -> None:
        mark = f"{fr['date']} lake {fr['stats']['lake_area_m2'] / 1e4:6.1f} ha" if fr else "skipped (cloud / coverage)"
        print(f"[{i:4d}/{n}] {mark}", flush=True)

    for lake in lakes:
        print(f"== {lake.name} -> {store.describe}", flush=True)
        if a.command == "publish":
            doc = store.load(f"archive/{lake.id}")
            if not doc:
                print("  no archive stored; run build first")
                continue
        elif a.command == "update":
            doc, fresh = builder.update(lake, store.load(f"archive/{lake.id}"))
            print(f"  {len(fresh)} new frame(s)")
            store.save(f"archive/{lake.id}", doc)
        else:
            start = datetime.fromisoformat(a.start or s.archive_start).replace(tzinfo=timezone.utc)
            end = datetime.fromisoformat(a.end).replace(tzinfo=timezone.utc) if a.end else datetime.now(timezone.utc)
            frames = builder.finalise(lake, builder.build_frames(lake, start, end, workers=a.workers, progress=progress))
            doc = builder.document(lake, frames)
            store.save(f"archive/{lake.id}", doc)
        if not doc["frames"]:
            print("  no usable frames; nothing published")
            continue
        print(f"  {len(doc['frames'])} frames -> {publish_lake(store, doc)}", flush=True)
        docs.append(doc)

    if docs:
        # index lists every lake that has an archive, not only the ones touched by this run
        known = {d["lake"]["id"]: d for d in docs}
        for lk in LAKES.values():
            if lk.id not in known and (other := store.load(f"archive/{lk.id}")):
                known[lk.id] = other
        publish_index(store, list(known.values()))
    print(f"done in {time.time() - t0:.0f}s")
    return 0 if docs else 1


if __name__ == "__main__":
    sys.exit(main())
