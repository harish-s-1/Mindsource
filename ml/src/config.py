"""Shared paths and constants for the MINDSource ML pipeline.

Dataset (this build): Microsoft Philly GPU-cluster DL job trace (real, public).
See ml/README.md for why this substitutes for Alibaba cluster-trace-gpu-v2026
(the v2026 data host is unreachable from the build network).
"""

from __future__ import annotations

import os

ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW = os.path.join(ML_DIR, "data", "raw")
DATA_PROCESSED = os.path.join(ML_DIR, "data", "processed")
MODELS_DIR = os.path.join(ML_DIR, "models")

# --- Philly trace (real, reachable via GitHub LFS) -------------------------
PHILLY_LFS_URL = (
    "https://media.githubusercontent.com/media/msr-fiddle/philly-traces/"
    "master/trace-data.tar.gz"
)
PHILLY_TARBALL = os.path.join(DATA_RAW, "trace-data.tar.gz")
# The one member we use: per-job scheduling log (JSON).
PHILLY_JOB_LOG_MEMBER = "trace-data/cluster_job_log"
PHILLY_JOB_LOG = os.path.join(DATA_RAW, "cluster_job_log")

# --- Processed / model artifacts -------------------------------------------
PROCESSED_CSV = os.path.join(DATA_PROCESSED, "philly_jobs.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "runtime_xgboost.json")
PREPROCESS_PATH = os.path.join(MODELS_DIR, "preprocess.json")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")

# --- Modeling constants ----------------------------------------------------
TARGET = "runtime_minutes"          # regression target (see README)
LOG_TARGET = True                    # train on log1p(runtime), report in minutes
CHRONO_SPLIT_QUANTILE = 0.8          # first 80% by submit time -> train
RANDOM_SEED = 42

# Minimum sane runtime to keep a row (drop 0/negative durations).
MIN_RUNTIME_MINUTES = 0.5
# Cap absurd outliers (a few jobs run for weeks); keep within a defensible range.
MAX_RUNTIME_MINUTES = 60 * 24 * 30   # 30 days
