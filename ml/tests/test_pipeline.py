"""ML pipeline tests (code correctness).

These exercise the parser, preprocessing, training machinery, save/load and
inference using a SMALL SYNTHETIC FIXTURE — NOT the Philly dataset. The fixture
exists only to validate code paths deterministically without the ~1 GB download.
Real dataset metrics come from `python -m src.train` on the real data and are
never fabricated here.

Run:  python -m tests.test_pipeline   (from the ml/ directory)
"""

from __future__ import annotations

import datetime as dt
import json
import os
import tempfile

import numpy as np

from src import config
from src.preprocess import FEATURES, build_dataset, extract_rows
from src.predict import ModelNotTrainedError, RuntimePredictor


# --- Synthetic Philly-shaped fixture (NOT the real dataset) -----------------
def _make_fixture_jobs(n: int = 120) -> list[dict]:
    rng = np.random.default_rng(0)
    base = dt.datetime(2017, 10, 1, 8, 0, 0)
    jobs: list[dict] = []
    for i in range(n):
        gpus = int(rng.choice([1, 2, 4, 8]))
        servers = 1 if gpus <= 4 else 2
        per = max(1, gpus // servers)
        submit = base + dt.timedelta(hours=i)
        start = submit + dt.timedelta(minutes=5)
        # runtime correlates with gpus (so the machinery has signal to fit)
        runtime_min = 30 + gpus * 15 + float(rng.normal(0, 5))
        end = start + dt.timedelta(minutes=runtime_min)
        detail = [{"ip": f"m{s}", "gpus": [f"gpu{g}" for g in range(per)]} for s in range(servers)]
        jobs.append(
            {
                "status": "Pass",
                "vc": "vcA" if i % 2 == 0 else "vcB",
                "jobid": f"job{i}",
                "user": f"u{i%5}",
                "submitted_time": submit.strftime("%Y-%m-%d %H:%M:%S"),
                "attempts": [
                    {
                        "start_time": start.strftime("%Y-%m-%d %H:%M:%S"),
                        "end_time": end.strftime("%Y-%m-%d %H:%M:%S"),
                        "detail": detail,
                    }
                ],
            }
        )
    # A job whose attempt never ran (None times) must be skipped.
    jobs.append(
        {
            "status": "Failed",
            "vc": "vcA",
            "jobid": "jobbad",
            "submitted_time": base.strftime("%Y-%m-%d %H:%M:%S"),
            "attempts": [{"start_time": "None", "end_time": "None", "detail": []}],
        }
    )
    return jobs


def test_extract_rows_and_missing_handling() -> None:
    jobs = _make_fixture_jobs(20)
    rows = extract_rows(jobs)
    # 20 valid + 1 invalid(skipped)
    assert len(rows) == 20
    r = rows[0]
    assert r["num_gpus"] >= 1 and r["num_servers"] >= 1
    assert r["runtime_minutes"] > 0
    assert set(["num_gpus", "vc", "submit_ts", "runtime_minutes"]).issubset(r)


def _fixture_dataset(tmp: str) -> dict:
    jobs = _make_fixture_jobs(120)
    path = os.path.join(tmp, "cluster_job_log")
    with open(path, "w") as f:
        json.dump(jobs, f)
    return build_dataset(path)


def test_build_dataset_chronological_split() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        ds = _fixture_dataset(tmp)
        meta = ds["meta"]
        assert meta["n_train"] + meta["n_test"] == meta["n_total"]
        assert meta["n_train"] > meta["n_test"] > 0
        assert list(ds["X_train"].shape)[1] == len(FEATURES)
        # vc_freq learned from train only (leakage-free)
        assert set(meta["vc_freq"]).issubset({"vcA", "vcB"})


def test_train_save_load_predict_and_baseline() -> None:
    import xgboost as xgb
    from sklearn.metrics import mean_absolute_error

    with tempfile.TemporaryDirectory() as tmp:
        ds = _fixture_dataset(tmp)
        X_tr, y_tr = ds["X_train"], ds["y_train"]
        X_te, y_te = ds["X_test"], ds["y_test"]

        # Baseline: predict train mean.
        base_pred = np.full_like(y_te, float(np.mean(y_tr)))
        base_mae = mean_absolute_error(y_te, base_pred)

        # XGBoost on log target.
        model = xgb.XGBRegressor(n_estimators=60, max_depth=3, random_state=42)
        model.fit(X_tr, np.log1p(y_tr))
        xgb_mae = mean_absolute_error(y_te, np.expm1(model.predict(X_te)))
        assert np.isfinite(base_mae) and np.isfinite(xgb_mae)

        # Save artifacts and reload via the real inference class.
        model_path = os.path.join(tmp, "m.json")
        pp_path = os.path.join(tmp, "pp.json")
        model.save_model(model_path)
        with open(pp_path, "w") as f:
            json.dump(
                {
                    "dataset": "fixture",
                    "target": config.TARGET,
                    "log_target": True,
                    "features": FEATURES,
                    "vc_freq": ds["meta"]["vc_freq"],
                    "vc_freq_default": 0,
                    "feature_medians": ds["meta"]["feature_medians"],
                },
                f,
            )
        predictor = RuntimePredictor(model_path, pp_path, os.path.join(tmp, "none.json"))
        out = predictor.predict({"gpu_count": 4})
        assert out["model"] == "XGBoost"
        assert out["target"] == config.TARGET
        assert isinstance(out["prediction"], float) and out["prediction"] >= 0

        # Invalid input.
        try:
            predictor.predict({"gpu_count": 0})
            raise AssertionError("expected ValueError for gpu_count=0")
        except ValueError:
            pass


def test_missing_model_raises() -> None:
    try:
        RuntimePredictor("/no/model.json", "/no/pp.json")
        raise AssertionError("expected ModelNotTrainedError")
    except ModelNotTrainedError:
        pass


def _run_all() -> None:
    tests = sorted(
        (v for k, v in globals().items() if k.startswith("test_") and callable(v)),
        key=lambda f: f.__code__.co_firstlineno,
    )
    for t in tests:
        t()
        print(f"  PASS  {t.__name__}")
    print(f"\n{len(tests)}/{len(tests)} ML pipeline checks passed.")


if __name__ == "__main__":
    _run_all()
