"""Train the runtime model: mean baseline vs XGBoost, on the real Philly split.

Saves the model, preprocessing metadata, and REAL evaluation metrics to
ml/models/. Reports metrics to stdout. No metric is hardcoded.

    python -m src.train
"""

from __future__ import annotations

import json
import os

import numpy as np

from . import config
from .preprocess import FEATURES, build_dataset, save_processed_summary


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": rmse,
        "r2": float(r2_score(y_true, y_pred)),
    }


def main() -> int:
    import xgboost as xgb

    print("Building dataset from the real Philly job log…")
    ds = build_dataset()
    X_train, y_train = ds["X_train"], ds["y_train"]
    X_test, y_test = ds["X_test"], ds["y_test"]
    meta = ds["meta"]
    save_processed_summary(meta)

    print(f"Train rows: {meta['n_train']:,} | Test rows: {meta['n_test']:,}")
    print(f"Split     : {meta['split']}")

    # --- Baselines: constant predictors -------------------------------------
    # Mean is the RMSE-optimal constant; median is the MAE-optimal constant and
    # a fairer bar on this heavy-tailed target. We compare XGBoost to both.
    baseline_mean = _metrics(y_test, np.full_like(y_test, float(np.mean(y_train))))
    baseline_median = _metrics(y_test, np.full_like(y_test, float(np.median(y_train))))
    baseline = baseline_mean  # primary (mean) baseline for reporting

    # --- XGBoost (trained on log1p(runtime) to tame the heavy tail) ----------
    y_train_t = np.log1p(y_train) if config.LOG_TARGET else y_train
    model = xgb.XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=config.RANDOM_SEED,
        n_jobs=0,
    )
    model.fit(X_train, y_train_t)
    pred_t = model.predict(X_test)
    xgb_pred = np.clip(np.expm1(pred_t) if config.LOG_TARGET else pred_t, 0, None)
    xgb_metrics = _metrics(y_test, xgb_pred)

    # Also evaluate in the log space the model actually optimizes — on this
    # heavy-tailed target, log-space R2 is the honest signal indicator.
    log_metrics = None
    if config.LOG_TARGET:
        y_test_log = np.log1p(y_test)
        base_log = np.full_like(y_test_log, float(np.mean(np.log1p(y_train))))
        log_metrics = {
            "xgboost": _metrics(y_test_log, pred_t),
            "baseline_mean": _metrics(y_test_log, base_log),
            "space": "log1p(minutes)",
        }

    # --- Feature importance (real, gain-based) -------------------------------
    importances = model.feature_importances_.tolist()
    feat_imp = sorted(
        ({"feature": f, "importance": float(v)} for f, v in zip(FEATURES, importances)),
        key=lambda d: d["importance"],
        reverse=True,
    )

    mae_impr = (baseline["mae"] - xgb_metrics["mae"]) / baseline["mae"] * 100
    rmse_impr = (baseline["rmse"] - xgb_metrics["rmse"]) / baseline["rmse"] * 100
    mae_impr_median = (
        (baseline_median["mae"] - xgb_metrics["mae"]) / baseline_median["mae"] * 100
    )

    # --- Persist artifacts ---------------------------------------------------
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    model.save_model(config.MODEL_PATH)
    with open(config.PREPROCESS_PATH, "w") as f:
        json.dump(
            {
                "dataset": meta["dataset"],
                "target": meta["target"],
                "log_target": meta["log_target"],
                "features": FEATURES,
                "vc_freq": meta["vc_freq"],
                "vc_freq_default": meta["vc_freq_default"],
                "feature_medians": meta["feature_medians"],
            },
            f,
        )
    metrics_out = {
        "dataset": meta["dataset"],
        "target": meta["target"],
        "prediction_type": "regression",
        "unit": "minutes",
        "n_train": meta["n_train"],
        "n_test": meta["n_test"],
        "split": meta["split"],
        "baseline": {"strategy": "train-mean", **baseline},
        "baseline_median": {"strategy": "train-median", **baseline_median},
        "xgboost": {"config": model.get_params(), **xgb_metrics},
        "log_space": log_metrics,
        "improvement": {
            "mae_pct_vs_mean": mae_impr,
            "rmse_pct_vs_mean": rmse_impr,
            "mae_pct_vs_median": mae_impr_median,
        },
        "feature_importance": feat_imp,
    }
    # get_params returns non-serializable defaults sometimes; coerce.
    metrics_out["xgboost"]["config"] = {
        k: v for k, v in model.get_params().items() if isinstance(v, (int, float, str, bool, type(None)))
    }
    with open(config.METRICS_PATH, "w") as f:
        json.dump(metrics_out, f, indent=2)

    # --- Report --------------------------------------------------------------
    print("\n================ RESULTS (real, on held-out test) ============")
    print(f"Target        : {meta['target']} (minutes)")
    print(f"Baseline mean : MAE={baseline_mean['mae']:.2f}  RMSE={baseline_mean['rmse']:.2f}  R2={baseline_mean['r2']:.4f}")
    print(f"Baseline med. : MAE={baseline_median['mae']:.2f}  RMSE={baseline_median['rmse']:.2f}  R2={baseline_median['r2']:.4f}")
    print(f"XGBoost       : MAE={xgb_metrics['mae']:.2f}  RMSE={xgb_metrics['rmse']:.2f}  R2={xgb_metrics['r2']:.4f}")
    print(f"Improvement   : MAE {mae_impr:.1f}% vs mean, {mae_impr_median:.1f}% vs median  |  RMSE {rmse_impr:.1f}% vs mean")
    if log_metrics:
        lx, lb = log_metrics["xgboost"], log_metrics["baseline_mean"]
        print(f"Log space     : XGB R2={lx['r2']:.4f} MAE={lx['mae']:.3f} | baseline R2={lb['r2']:.4f} MAE={lb['mae']:.3f}")
    print("Top features  :")
    for d in feat_imp[:5]:
        print(f"   {d['feature']:<16} {d['importance']:.4f}")
    print(f"\nSaved model      -> {config.MODEL_PATH}")
    print(f"Saved preprocess -> {config.PREPROCESS_PATH}")
    print(f"Saved metrics    -> {config.METRICS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
