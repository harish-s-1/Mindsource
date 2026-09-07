"""Inference for the runtime model.

Loads the saved XGBoost model + preprocessing metadata and predicts expected
runtime (minutes) for a workload described by information known BEFORE it runs.
Lightweight: needs only numpy + xgboost (no pandas/sklearn), so the FastAPI
backend can reuse it directly.

    python -m src.predict --gpu-count 4
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from typing import Any

from . import config


class ModelNotTrainedError(RuntimeError):
    """Raised when the model artifacts are missing (train.py not run yet)."""


class RuntimePredictor:
    """Loads the model once and predicts runtime for workload inputs."""

    def __init__(
        self,
        model_path: str = config.MODEL_PATH,
        preprocess_path: str = config.PREPROCESS_PATH,
        metrics_path: str = config.METRICS_PATH,
    ) -> None:
        if not os.path.exists(model_path) or not os.path.exists(preprocess_path):
            raise ModelNotTrainedError(
                "Model artifacts not found. Train first: python -m src.train"
            )
        import xgboost as xgb

        self._model = xgb.XGBRegressor()
        self._model.load_model(model_path)
        with open(preprocess_path) as f:
            self._pp = json.load(f)
        self.features: list[str] = self._pp["features"]
        self.target: str = self._pp["target"]
        self._log_target: bool = self._pp["log_target"]
        self._vc_freq: dict[str, float] = self._pp.get("vc_freq", {})
        self._medians: dict[str, float] = self._pp.get("feature_medians", {})
        # Global feature importance (for "top factors"), if metrics are present.
        self._top: list[str] = []
        if os.path.exists(metrics_path):
            with open(metrics_path) as f:
                m = json.load(f)
            self._top = [d["feature"] for d in m.get("feature_importance", [])]

    def _vector(self, wl: dict[str, Any]) -> list[float]:
        gpu_count = float(wl["gpu_count"])
        if gpu_count <= 0:
            raise ValueError("gpu_count must be >= 1")
        # Derive Philly-shaped features from the workload with documented defaults.
        num_servers = wl.get("num_servers")
        if num_servers is None:
            num_servers = max(1, math.ceil(gpu_count / 8))
        num_servers = float(num_servers)
        now = datetime.now(timezone.utc)
        submit_hour = float(wl.get("submit_hour", now.hour))
        submit_dow = float(wl.get("submit_dow", now.weekday()))
        vc = wl.get("vc")
        vc_freq = (
            float(self._vc_freq.get(vc, self._medians.get("vc_freq", 0.0)))
            if vc is not None
            else self._medians.get("vc_freq", 0.0)
        )
        values = {
            "num_gpus": gpu_count,
            "num_servers": num_servers,
            "gpus_per_server": gpu_count / num_servers,
            "is_distributed": 1.0 if num_servers > 1 else 0.0,
            "submit_hour": submit_hour,
            "submit_dow": submit_dow,
            "vc_freq": vc_freq,
        }
        return [float(values[f]) for f in self.features]

    def predict(self, workload: dict[str, Any]) -> dict[str, Any]:
        import numpy as np

        x = np.array([self._vector(workload)], dtype=float)
        raw = float(self._model.predict(x)[0])
        minutes = math.expm1(raw) if self._log_target else raw
        minutes = max(0.0, minutes)
        return {
            "model": "XGBoost",
            "target": self.target,
            "prediction": round(minutes, 2),
            "unit": "minutes",
            "prediction_hours": round(minutes / 60.0, 2),
            "top_features": self._top[:3],
        }


def main() -> int:
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--gpu-count", type=float, required=True)
    p.add_argument("--num-servers", type=int, default=None)
    args = p.parse_args()
    predictor = RuntimePredictor()
    wl: dict[str, Any] = {"gpu_count": args.gpu_count}
    if args.num_servers is not None:
        wl["num_servers"] = args.num_servers
    print(json.dumps(predictor.predict(wl), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
