# MINDSource ML — Workload Runtime Intelligence (Phase 3A/3B)

Real production GPU-cluster data → feature engineering → XGBoost → runtime
prediction, served to the FastAPI backend for advisory workload intelligence.

> **Honesty note.** This model is trained on a **public, historical** production
> GPU-cluster trace. It is **not** trained on MINDSource's live RTX 3050
> telemetry. Live telemetry (nvidia-smi connector) and this historical ML model
> are kept strictly separate.

---

## 1–4. Dataset

- **Used in this build:** **Microsoft Philly GPU-cluster DL job trace** (real,
  public). Source: <https://github.com/msr-fiddle/philly-traces>. From the ATC'19
  paper *"Analysis of Large-Scale Multi-Tenant GPU Clusters for DNN Training
  Workloads."* Aug 7 – Dec 22, 2017; 117,325 jobs.
- **License/usage:** released by Microsoft Research for research use; see the
  repository's `LICENSE`. Data is **not** committed here (see `.gitignore`).
- **Primary target dataset requested:** Alibaba **cluster-trace-gpu-v2026**
  (<https://github.com/alibaba/clusterdata/tree/master/cluster-trace-gpu-v2026>).
  Its data is hosted only on Alibaba OSS
  (`tre-clusterdata.oss-cn-hangzhou.aliyuncs.com`), which is **firewalled on the
  build network** (verified: `http 000`), so it could not be downloaded here.
  `download_dataset.py`/config document the official archives so it can be used
  on an unrestricted network; the pipeline generalizes to it (see §Schema).

## 5. Download

We fetch only the `cluster_job_log` (38.97 MB extracted) from the ~1 GB LFS
tarball via GitHub's LFS media endpoint (reachable), skipping the huge util CSVs.

```bash
cd ml
python -m src.download_dataset --extract
```

## 7. Schema (real, from the data — not assumed)

`cluster_job_log` is a JSON list of 117,325 jobs. Verified keys:

- job: `jobid`, `status` (`Pass`/`Failed`/`Killed`), `vc`, `user`,
  `submitted_time`, `attempts`
- attempt: `start_time`, `end_time`, `detail`
- detail: `ip`, `gpus` (list of GPU ids)

Stats: 15 VCs; GPU count 1–128 (median 1); runtime 0.5–43,169 min
(median 17.8, mean 360.8) — a heavy right tail. 106,452 jobs have a completed
first run.

> The Alibaba v2026 `asi_opensource_job_execution_summary` table exposes the
> same modeling shape (`gpu_request`, `job_type_public`, `model_type_public`,
> `priority_class`, `gpu_spec_public`, and `duration_hours` as the target).

## 8. Selected target

**`runtime_minutes`** — job execution duration (regression). Answers
MINDSource's "what runtime should we expect from this workload?" It is known
only *after* a run (so it is never used as a feature), and is predicted from
resource-request attributes known at submission.

## 9. Features (leakage-free)

Built from one row per job — its **first completed run**:

| Feature | From |
|---|---|
| `num_gpus` | GPUs allocated to the run (= the job's GPU request; known at scheduling) |
| `num_servers` | number of hosting servers |
| `gpus_per_server` | `num_gpus / num_servers` |
| `is_distributed` | `num_servers > 1` |
| `submit_hour`, `submit_dow` | from `submitted_time` |
| `vc_freq` | training-set frequency of the job's VC (leakage-free frequency encoding) |

## 10. Leakage exclusions (why)

Excluded because they are unknown **before** the run completes: `status`,
`end_time`, retry/attempt count, later attempts, and any post-completion
utilization/scheduling-delay fields. We also use only the **first** completed
attempt to avoid retry leakage.

## 11–13. Training

Chronological split (no temporal leakage): first 80 % of jobs by
`submitted_time` → train, last 20 % → test. Target trained as `log1p(minutes)`
(heavy tail). XGBoost regressor (400 trees, depth 6, lr 0.05, subsample 0.8).

```bash
python -m src.inspect_dataset      # dataset-quality report
python -m src.train                # baseline vs XGBoost, saves models/
python -m src.evaluate             # reload + re-score (save/load check)
```

- **Train rows:** 85,161  **Test rows:** 21,291

## 14. Evaluation (REAL, held-out test — not fabricated)

| Model | MAE (min) | RMSE (min) | R² (min) |
|---|---|---|---|
| Baseline — train **mean** | 550.32 | 1389.56 | -0.000 |
| Baseline — train **median** | 355.33 | 1430.25 | -0.059 |
| **XGBoost** | **356.47** | 1410.98 | -0.031 |

Log-space (the scale the model optimizes, `log1p(minutes)`):
**XGBoost R² = 0.153** vs mean-baseline R² ≈ 0; XGBoost MAE 1.674 vs 2.034.

**Improvement:** MAE **35.2 % better than the mean baseline**; essentially tied
with the (MAE-optimal) median baseline in raw minutes.

**Honest interpretation.** DL job runtime is extremely heavy-tailed and largely
driven by factors *not* in the trace (model architecture, dataset size, epochs,
early stopping). From resource-request features alone the model **captures
order-of-magnitude / log-scale structure** (log-R² ≈ 0.15) and beats the naive
mean baseline by 35 % on MAE, but does **not** beat a trivial median predictor
in raw minutes, and raw-minute R² ≈ 0 because the extreme tail dominates
squared error. This is reported transparently rather than hidden.

### Feature importance (real, gain-based)

`vc_freq` 0.304 · `gpus_per_server` 0.189 · `is_distributed` 0.147 ·
`num_gpus` 0.107 · `submit_dow` 0.102 · `submit_hour` 0.081 · `num_servers` 0.070.

## 15. Model files

`models/runtime_xgboost.json` (model), `models/preprocess.json` (features +
vc-frequency map + medians), `models/metrics.json` (all metrics above).

## Inference & API

```bash
python -m src.predict --gpu-count 4        # standalone
```

Backend (inference only — never trains):

```bash
# from backend/, with the venv active and ml deps installed
python -m uvicorn app.main:app --reload --port 8000
curl -s -X POST http://localhost:8000/api/ml/predict -H "Content-Type: application/json" -d '{"gpu_count":8}'
curl -s http://localhost:8000/api/ml/model
```

`POST /api/ml/predict` returns `{model, target, prediction, unit,
prediction_hours, top_features, dataset}`. If the model file is missing it
returns **503** (no silent replacement model). Workload creation calls this
engine automatically after the security gate passes (advisory only — it never
blocks creation and is never fabricated).

## Limitations

- Substitute dataset (Philly, 2017) because Alibaba v2026's host is unreachable
  here; the pipeline is written to also target v2026.
- Runtime is only weakly predictable from resource-request features (see §14) —
  the model is advisory, best read as an order-of-magnitude estimate.
- At MINDSource inference time only `gpu_count` is truly available; other Philly
  features are derived with documented defaults (`predict.py`).
- Not implemented (later phases): decision engine, resource selection, SHAP,
  Alibaba v2026 training run.

## Reproduce (exact commands)

```bash
# 1. install ML deps (into the backend venv, which the API also uses)
cd backend && python -m pip install -r ../ml/requirements.txt

# 2. dataset
cd ../ml && python -m src.download_dataset --extract

# 3. inspect / train / evaluate
python -m src.inspect_dataset
python -m src.train
python -m src.evaluate

# 4. tests
python -m tests.test_pipeline
```
