"""Re-evaluate the saved model on the chronological test split.

Rebuilds the same split as training and reports metrics from the loaded model
(sanity check that saved artifacts reproduce training-time numbers).

    python -m src.evaluate
"""

from __future__ import annotations

import json

import numpy as np

from . import config
from .predict import RuntimePredictor
from .preprocess import build_dataset


def main() -> int:
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    ds = build_dataset()
    X_test, y_test = ds["X_test"], ds["y_test"]

    predictor = RuntimePredictor()
    # Predict directly from the raw feature matrix using the loaded booster.
    raw = predictor._model.predict(X_test)  # noqa: SLF001 (internal reuse)
    pred = np.clip(np.expm1(raw) if predictor._log_target else raw, 0, None)

    out = {
        "n_test": int(len(y_test)),
        "mae": float(mean_absolute_error(y_test, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, pred))),
        "r2": float(r2_score(y_test, pred)),
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
