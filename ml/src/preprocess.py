"""Feature engineering for the Philly job-runtime model.

Parses the real cluster_job_log into one row per job (its first completed run),
builds only leakage-free, submission/scheduling-time features, and produces a
chronological train/test split. Every transformation is documented inline.

Target:   runtime_minutes  (regression)
Features: num_gpus, num_servers, gpus_per_server, is_distributed,
          submit_hour, submit_dow, vc_freq
Excluded (leakage): status, end_time, retry/attempt count, later attempts,
          scheduling/queue delay — none are known before the run completes.
"""

from __future__ import annotations

import datetime as dt
import json
import os
from typing import Any

from . import config

FEATURES = [
    "num_gpus",
    "num_servers",
    "gpus_per_server",
    "is_distributed",
    "submit_hour",
    "submit_dow",
    "vc_freq",
]

_TIME_FORMATS = ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S")


def _parse_time(value: Any) -> dt.datetime | None:
    if not value or value in ("None", "none", "null"):
        return None
    if not isinstance(value, str):
        return None
    for fmt in _TIME_FORMATS:
        try:
            return dt.datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def _attempt_gpus(attempt: dict) -> tuple[int, int]:
    """Return (num_gpus, num_servers) allocated in an attempt."""
    detail = attempt.get("detail") or []
    num_servers = 0
    num_gpus = 0
    for d in detail:
        gpus = d.get("gpus") or []
        if gpus:
            num_gpus += len(gpus)
            num_servers += 1
    return num_gpus, num_servers


def extract_rows(jobs: list[dict]) -> list[dict]:
    """One row per job, from its first attempt that actually ran to completion.

    A job's GPU allocation equals its GPU request in Philly, and is known at
    scheduling time (before the run's duration is observed) — so it is a valid,
    non-leaking feature for predicting runtime.
    """
    rows: list[dict] = []
    for job in jobs:
        submit = _parse_time(job.get("submitted_time"))
        for attempt in job.get("attempts") or []:
            start = _parse_time(attempt.get("start_time"))
            end = _parse_time(attempt.get("end_time"))
            if start is None or end is None:
                continue
            runtime_min = (end - start).total_seconds() / 60.0
            if runtime_min < config.MIN_RUNTIME_MINUTES:
                continue
            if runtime_min > config.MAX_RUNTIME_MINUTES:
                continue
            num_gpus, num_servers = _attempt_gpus(attempt)
            if num_gpus <= 0 or num_servers <= 0:
                continue
            submit_ts = (submit or start).timestamp()
            submit_dt = submit or start
            rows.append(
                {
                    "num_gpus": num_gpus,
                    "num_servers": num_servers,
                    "gpus_per_server": num_gpus / num_servers,
                    "is_distributed": 1 if num_servers > 1 else 0,
                    "submit_hour": submit_dt.hour,
                    "submit_dow": submit_dt.weekday(),
                    "vc": job.get("vc"),
                    "submit_ts": submit_ts,
                    "runtime_minutes": runtime_min,
                }
            )
            break  # first completed run only (avoids retry leakage)
    return rows


def load_jobs(path: str = config.PHILLY_JOB_LOG) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        head = f.read(1)
        f.seek(0)
        data = json.load(f) if head in "[{" else [json.loads(l) for l in f if l.strip()]
    return list(data.values()) if isinstance(data, dict) else data


def build_dataset(path: str = config.PHILLY_JOB_LOG) -> dict:
    """Return train/test feature matrices + target + preprocessing metadata."""
    import numpy as np

    rows = extract_rows(load_jobs(path))
    if not rows:
        raise SystemExit("No usable rows parsed from the job log.")
    rows.sort(key=lambda r: r["submit_ts"])  # chronological

    n = len(rows)
    cut = int(n * config.CHRONO_SPLIT_QUANTILE)
    train_rows, test_rows = rows[:cut], rows[cut:]

    # vc_freq: frequency of each vc in TRAIN only (leakage-free). Unseen -> 0.
    vc_freq: dict[str, int] = {}
    for r in train_rows:
        vc_freq[r["vc"]] = vc_freq.get(r["vc"], 0) + 1

    def to_matrix(rs: list[dict]) -> tuple[Any, Any]:
        X = np.array(
            [
                [
                    r["num_gpus"],
                    r["num_servers"],
                    r["gpus_per_server"],
                    r["is_distributed"],
                    r["submit_hour"],
                    r["submit_dow"],
                    float(vc_freq.get(r["vc"], 0)),
                ]
                for r in rs
            ],
            dtype=float,
        )
        y = np.array([r["runtime_minutes"] for r in rs], dtype=float)
        return X, y

    X_train, y_train = to_matrix(train_rows)
    X_test, y_test = to_matrix(test_rows)

    meta = {
        "dataset": "Microsoft Philly GPU-cluster trace (cluster_job_log)",
        "target": config.TARGET,
        "log_target": config.LOG_TARGET,
        "features": FEATURES,
        "vc_freq": vc_freq,
        "vc_freq_default": 0,
        "split": "chronological by submitted_time (first 80% train / last 20% test)",
        "n_total": n,
        "n_train": len(train_rows),
        "n_test": len(test_rows),
        # Median feature values for inference defaults when a field is unknown.
        "feature_medians": {
            f: float(np.median(X_train[:, i])) for i, f in enumerate(FEATURES)
        },
    }
    return {
        "X_train": X_train,
        "y_train": y_train,
        "X_test": X_test,
        "y_test": y_test,
        "meta": meta,
    }


def save_processed_summary(meta: dict) -> None:
    os.makedirs(config.DATA_PROCESSED, exist_ok=True)
    with open(os.path.join(config.DATA_PROCESSED, "summary.json"), "w") as f:
        json.dump({k: v for k, v in meta.items() if k != "vc_freq"}, f, indent=2)
