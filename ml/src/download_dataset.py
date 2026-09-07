"""Reproducible dataset download.

Default: the Microsoft Philly GPU-cluster trace (real, public), fetched from the
GitHub LFS media endpoint (reachable). We keep only `cluster_job_log`.

Also documents the Alibaba cluster-trace-gpu-v2026 archives so a developer on an
unrestricted network can fetch those instead (see ml/README.md).

Usage:
    python -m src.download_dataset            # download Philly tarball
    python -m src.download_dataset --extract  # + extract cluster_job_log
"""

from __future__ import annotations

import argparse
import os
import sys
import tarfile
import urllib.request

from . import config


def download_philly(dest: str = config.PHILLY_TARBALL) -> str:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print(f"Already present: {dest} ({os.path.getsize(dest):,} bytes)")
        return dest
    print(f"Downloading Philly trace from {config.PHILLY_LFS_URL}")
    print("(~1.0 GB — this takes a while)")
    urllib.request.urlretrieve(config.PHILLY_LFS_URL, dest)
    print(f"Saved {dest} ({os.path.getsize(dest):,} bytes)")
    return dest


def extract_job_log(
    tarball: str = config.PHILLY_TARBALL, out: str = config.PHILLY_JOB_LOG
) -> str:
    """Extract only cluster_job_log from the tarball (skips the huge util CSVs)."""
    if os.path.exists(out) and os.path.getsize(out) > 0:
        print(f"Already extracted: {out} ({os.path.getsize(out):,} bytes)")
        return out
    print("Extracting cluster_job_log (streaming; other members skipped)…")
    with tarfile.open(tarball, mode="r:gz") as tar:
        member = None
        for m in tar:
            if os.path.basename(m.name) == "cluster_job_log" and m.isfile():
                member = m
                break
        if member is None:
            raise SystemExit("cluster_job_log not found in tarball")
        src = tar.extractfile(member)
        assert src is not None
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "wb") as f:
            while True:
                chunk = src.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
    print(f"Wrote {out} ({os.path.getsize(out):,} bytes)")
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--extract", action="store_true", help="extract cluster_job_log")
    args = parser.parse_args()
    download_philly()
    if args.extract:
        extract_job_log()
    return 0


if __name__ == "__main__":
    sys.exit(main())
