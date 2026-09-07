"""ML inference service (Phase 3B/3C).

Loads the offline-trained XGBoost runtime model and serves predictions. Training
happens entirely offline in ml/ — this service only performs inference and never
trains or fabricates a model. It reuses the exact preprocessing from ml/src so
training and inference cannot drift.

If the model artifacts are missing, predictions raise ModelNotTrainedError and
the API returns a clear error (no silent replacement model).
"""

from __future__ import annotations

import os
import sys
from functools import lru_cache
from typing import Any

# Make the standalone ml/ package importable so inference reuses the same
# feature logic as training (no train/inference mismatch).
_DEFAULT_ML_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "ml")
)
ML_DIR = os.environ.get("MINDSOURCE_ML_DIR", _DEFAULT_ML_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)


class ModelNotTrainedError(RuntimeError):
    """Raised when the trained model artifacts are not present."""


def _paths() -> dict[str, str]:
    # Env overrides let tests point at a fixture model without touching ml/models.
    from src import config as ml_config  # type: ignore

    return {
        "model_path": os.environ.get("MINDSOURCE_MODEL_PATH", ml_config.MODEL_PATH),
        "preprocess_path": os.environ.get(
            "MINDSOURCE_PREPROCESS_PATH", ml_config.PREPROCESS_PATH
        ),
        "metrics_path": os.environ.get("MINDSOURCE_METRICS_PATH", ml_config.METRICS_PATH),
    }


@lru_cache(maxsize=1)
def _load_predictor():
    from src.predict import (  # type: ignore
        ModelNotTrainedError as _MNT,
        RuntimePredictor,
    )

    try:
        return RuntimePredictor(**_paths())
    except _MNT as exc:
        raise ModelNotTrainedError(str(exc)) from exc


def reset_cache() -> None:
    """Clear the cached predictor (used by tests after swapping the model)."""
    _load_predictor.cache_clear()


def is_model_available() -> bool:
    p = _paths()
    return os.path.exists(p["model_path"]) and os.path.exists(p["preprocess_path"])


def predict_runtime(workload: dict[str, Any]) -> dict[str, Any]:
    """Predict expected runtime for a workload. Raises ModelNotTrainedError if
    the model is missing, or ValueError for invalid inputs."""
    predictor = _load_predictor()
    return predictor.predict(workload)


def model_info() -> dict[str, Any]:
    """Metadata about the loaded model for the frontend model card."""
    import json

    p = _paths()
    if not is_model_available():
        return {"available": False}
    info: dict[str, Any] = {"available": True, "model": "XGBoost"}
    if os.path.exists(p["metrics_path"]):
        with open(p["metrics_path"]) as f:
            m = json.load(f)
        info.update(
            {
                "dataset": m.get("dataset"),
                "target": m.get("target"),
                "unit": m.get("unit"),
                "n_train": m.get("n_train"),
                "n_test": m.get("n_test"),
                "metrics": m.get("xgboost"),
                "baseline": m.get("baseline"),
                "improvement": m.get("improvement"),
                "top_features": [d["feature"] for d in m.get("feature_importance", [])][:5],
            }
        )
    return info
