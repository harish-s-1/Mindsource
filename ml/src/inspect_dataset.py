"""Inspect the real Philly cluster_job_log and print a dataset-quality report.

Makes NO assumptions about columns — it reports what is actually present.

    python -m src.inspect_dataset
"""

from __future__ import annotations

import json
import os
from collections import Counter

from . import config


def load_job_log(path: str = config.PHILLY_JOB_LOG) -> list | dict:
    if not os.path.exists(path):
        raise SystemExit(
            f"Not found: {path}\nRun: python -m src.download_dataset --extract"
        )
    with open(path, "r", encoding="utf-8") as f:
        head = f.read(1)
        f.seek(0)
        if head == "[" or head == "{":
            data = json.load(f)
        else:  # JSON-lines fallback
            data = [json.loads(line) for line in f if line.strip()]
    # The Philly log is a dict keyed by job id, or a list of job objects.
    return data


def _as_jobs(data: list | dict) -> list[dict]:
    if isinstance(data, dict):
        return list(data.values())
    return data


def main() -> int:
    data = load_job_log()
    jobs = _as_jobs(data)
    print("=" * 60)
    print("Dataset: Microsoft Philly GPU-cluster DL job trace")
    print("=" * 60)
    print(f"Container type : {type(data).__name__}")
    print(f"Total jobs     : {len(jobs):,}")
    if not jobs:
        return 0

    sample = jobs[0]
    print(f"Job keys       : {sorted(sample.keys())}")

    attempts = sample.get("attempts") or []
    if attempts:
        print(f"Attempt keys   : {sorted(attempts[0].keys())}")
        det = attempts[0].get("detail") or []
        if det:
            print(f"Detail keys    : {sorted(det[0].keys())}")

    # Status distribution
    statuses = Counter(j.get("status") for j in jobs)
    print(f"Status buckets : {dict(statuses)}")

    # VC cardinality
    vcs = Counter(j.get("vc") for j in jobs)
    print(f"Distinct VCs   : {len(vcs)}")

    # GPU + runtime stats over first valid attempt
    from .preprocess import extract_rows  # reuse the real parser

    rows = extract_rows(jobs)
    print(f"Usable rows    : {len(rows):,} (jobs with a completed first run)")
    if rows:
        import statistics as st

        gpus = [r["num_gpus"] for r in rows]
        rt = [r["runtime_minutes"] for r in rows]
        print(f"GPU count      : min={min(gpus)} max={max(gpus)} "
              f"median={st.median(gpus)}")
        print(f"Runtime (min)  : min={min(rt):.2f} max={max(rt):.2f} "
              f"median={st.median(rt):.2f} mean={st.mean(rt):.2f}")
        times = sorted(r["submit_ts"] for r in rows if r.get("submit_ts"))
        if times:
            import datetime as dt

            print(f"Submit range   : {dt.datetime.fromtimestamp(times[0])} -> "
                  f"{dt.datetime.fromtimestamp(times[-1])}")
        gpu_dist = Counter(gpus)
        print(f"GPU histogram  : {dict(sorted(gpu_dist.items())[:12])} …")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
