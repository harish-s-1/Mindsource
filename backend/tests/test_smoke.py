"""Import + endpoint smoke checks for the MINDSource backend.

Runnable directly (`python tests/test_smoke.py`) or under pytest. Uses an
isolated temporary SQLite database so it never touches the dev database.
"""

from __future__ import annotations

import json
import os
import tempfile

# Point the app at a throwaway database BEFORE importing app modules.
_TMP_DB = os.path.join(tempfile.gettempdir(), "mindsource_test.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["MINDSOURCE_DATABASE_URL"] = f"sqlite:///{_TMP_DB}"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import DECISIONS, NODES, WORKLOADS, reset_and_seed  # noqa: E402

# Deterministic, fully-seeded database for the run.
_db = SessionLocal()
reset_and_seed(_db)
_db.close()

client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["simulated"] is True


def test_infrastructure() -> None:
    r = client.get("/api/infrastructure")
    assert r.status_code == 200
    body = r.json()
    assert body["cluster"] == "production-ai"
    assert body["node_count"] == len(NODES)
    assert len(body["inventory"]) == 4
    # Inventory internally consistent: allocated + available == total per pool.
    for pool in body["inventory"]:
        assert pool["allocated"] + pool["available"] == pool["total"]
    m = body["metrics"]
    assert m["total_gpus"] == 64
    assert m["allocated_gpus"] == 40
    assert m["available_gpus"] == 24
    assert m["active_workloads"] == 7
    assert m["queued_workloads"] == 5


def test_nodes() -> None:
    r = client.get("/api/nodes")
    assert r.status_code == 200
    assert len(r.json()) == len(NODES)


def test_workloads_list() -> None:
    r = client.get("/api/workloads")
    assert r.status_code == 200
    assert len(r.json()) == len(WORKLOADS)


def test_workload_create() -> None:
    before = len(client.get("/api/workloads").json())
    payload = {
        "name": "Smoke Test Workload",
        "team": "QA",
        "type": "Inference",
        "gpu_requested": 2,
        "gpu_type": "L4",
        "memory_gb": 64,
        "duration_hours": 4,
        "priority": "Low",
        "deadline": "2026-09-12T10:00:00Z",
    }
    r = client.post("/api/workloads", json=payload)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["id"].startswith("wl-")
    assert created["status"] == "Queued"
    assert created["node_id"] is None
    after = len(client.get("/api/workloads").json())
    assert after == before + 1


def test_workload_create_validation() -> None:
    # gpu_requested below minimum should be rejected.
    bad = {
        "name": "Bad",
        "team": "QA",
        "type": "Inference",
        "gpu_requested": 0,
        "gpu_type": "L4",
        "memory_gb": 64,
        "duration_hours": 4,
        "priority": "Low",
        "deadline": "2026-09-12T10:00:00Z",
    }
    r = client.post("/api/workloads", json=bad)
    assert r.status_code == 422


def test_decisions_list() -> None:
    r = client.get("/api/decisions")
    assert r.status_code == 200
    assert len(r.json()) == len(DECISIONS)


def test_decision_demo_detail() -> None:
    r = client.get("/api/decisions/demo")
    assert r.status_code == 200
    body = r.json()
    assert body["recommended_gpu_type"] == "L4"
    assert body["recommended_gpu_count"] == 4
    assert body["start_time"] == "14:20"
    assert body["expected_completion"] == "17:20"
    assert body["estimated_cost"] == 9.0
    assert len(body["factors"]) == 6
    assert len(body["rationale"]) == 4


def test_decision_synthesized_detail() -> None:
    r = client.get("/api/decisions/dec-1042")
    assert r.status_code == 200
    body = r.json()
    assert body["recommended_gpu_type"] == "H100"
    assert len(body["factors"]) == 3
    assert body["rationale"] == [body["reason"]]


def test_decision_not_found() -> None:
    r = client.get("/api/decisions/does-not-exist")
    assert r.status_code == 404


def test_schedule() -> None:
    r = client.get("/api/schedule")
    assert r.status_code == 200
    body = r.json()
    assert body["start_hour"] == 12
    assert body["end_hour"] == 20
    assert len(body["pools"]) == 4
    labels = {p["gpu_type"]: p for p in body["pools"]}
    # Schedule pool inventory annotation matches infrastructure aggregation.
    assert labels["H100"]["allocated"] == 14
    assert labels["H100"]["total"] == 16
    # Vision Fine-tune scheduled block present on the L4 pool (ties to demo).
    l4_blocks = {b["workload_name"] for b in labels["L4"]["blocks"]}
    assert "Vision Fine-tune" in l4_blocks


def _telemetry(util: int = 32, used: int = 1200) -> dict:
    return {
        "source": "nvidia-smi",
        "node_id": "test-laptop",
        "hostname": "TEST-LAPTOP",
        "timestamp": "2026-09-07T15:00:00Z",
        "gpus": [
            {
                "index": 0,
                "name": "NVIDIA GeForce RTX 3050 Laptop GPU",
                "memory_total_mb": 4096,
                "memory_used_mb": used,
                "memory_free_mb": 4096 - used,
                "utilization_percent": util,
                "temperature_c": 50,
            }
        ],
    }


def test_connector_telemetry_accepted() -> None:
    r = client.post("/api/connectors/gpu/telemetry", json=_telemetry())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "accepted"
    assert body["node_id"] == "test-laptop"
    assert body["gpu_count"] == 1
    assert body["utilization"] == 32
    assert body["live_status"] == "online"


def test_connector_upsert_no_duplicate() -> None:
    before = len(client.get("/api/nodes").json())
    # Second telemetry with changed values must update, not duplicate.
    r = client.post("/api/connectors/gpu/telemetry", json=_telemetry(util=71, used=2000))
    assert r.status_code == 200
    after_nodes = client.get("/api/nodes").json()
    assert len(after_nodes) == before  # no new node row
    node = next(n for n in after_nodes if n["id"] == "test-laptop")
    assert node["utilization"] == 71
    assert node["memory_used_mb"] == 2000
    assert node["source"] == "nvidia-smi"
    assert node["gpu_name"].startswith("NVIDIA")


def test_connector_nodes_endpoint() -> None:
    r = client.get("/api/connectors/nodes")
    assert r.status_code == 200
    live = r.json()
    assert any(n["node_id"] == "test-laptop" for n in live)
    node = next(n for n in live if n["node_id"] == "test-laptop")
    assert node["live_status"] in ("online", "stale")


def test_live_node_does_not_change_simulated_metrics() -> None:
    # The simulated fleet totals must be unaffected by the live node.
    m = client.get("/api/infrastructure").json()["metrics"]
    assert m["total_gpus"] == 64
    assert m["allocated_gpus"] == 40


def test_connector_rejects_malformed_payload() -> None:
    r = client.post("/api/connectors/gpu/telemetry", json={"source": "nvidia-smi"})
    assert r.status_code == 422
    # Unknown extra fields are rejected too.
    bad = _telemetry()
    bad["exec"] = "rm -rf /"
    r2 = client.post("/api/connectors/gpu/telemetry", json=bad)
    assert r2.status_code == 422


# --- Security policy engine (Phase 2A) -------------------------------------
def _scan(**overrides) -> dict:
    """A safe baseline scan request with optional field overrides."""
    body = {
        "name": "safe-workload",
        "image": "nvcr.io/nvidia/pytorch:24.01",
        "gpu_count": 2,
        "capabilities": [],
    }
    body.update(overrides)
    return client.post("/api/security/scan", json=body).json()


def test_security_safe_workload_passes() -> None:
    r = client.post("/api/security/scan", json={"name": "ok", "gpu_count": 1})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "PASS"
    assert body["risk_level"] == "LOW"
    assert body["violations"] == []
    assert body["scanned_rules"] == 7


def test_security_privileged_blocks_sec001() -> None:
    body = _scan(privileged=True)
    assert body["status"] == "BLOCK"
    assert body["risk_level"] == "CRITICAL"
    codes = [v["rule_code"] for v in body["violations"]]
    assert codes == ["SEC-001"]
    assert body["violations"][0]["action"] == "BLOCK"


def test_security_host_network_blocks_sec002() -> None:
    body = _scan(host_network=True)
    assert body["status"] == "BLOCK"
    assert body["risk_level"] == "HIGH"
    assert [v["rule_code"] for v in body["violations"]] == ["SEC-002"]


def test_security_host_pid_blocks_sec003() -> None:
    body = _scan(host_pid=True)
    assert [v["rule_code"] for v in body["violations"]] == ["SEC-003"]
    assert body["risk_level"] == "HIGH"


def test_security_host_path_blocks_sec004() -> None:
    body = _scan(host_path_mounts=True)
    assert [v["rule_code"] for v in body["violations"]] == ["SEC-004"]
    assert body["risk_level"] == "CRITICAL"


def test_security_dangerous_capability_blocks_sec005() -> None:
    body = _scan(capabilities=["NET_RAW", "SYS_ADMIN"])
    codes = [v["rule_code"] for v in body["violations"]]
    assert codes == ["SEC-005"]
    assert "SYS_ADMIN" in body["violations"][0]["message"]
    assert body["risk_level"] == "HIGH"


def test_security_unapproved_registry_blocks_sec006() -> None:
    body = _scan(image="evil.example.com/malware:latest")
    assert [v["rule_code"] for v in body["violations"]] == ["SEC-006"]
    assert body["risk_level"] == "HIGH"
    # Implicit docker.io images are approved by default.
    assert _scan(image="nginx:latest")["status"] == "PASS"


def test_security_excessive_gpu_blocks_sec007() -> None:
    body = _scan(gpu_count=16)
    assert [v["rule_code"] for v in body["violations"]] == ["SEC-007"]
    assert body["risk_level"] == "MEDIUM"


def test_security_multiple_violations_returns_all() -> None:
    body = _scan(privileged=True, host_network=True, gpu_count=32)
    codes = [v["rule_code"] for v in body["violations"]]
    assert codes == ["SEC-001", "SEC-002", "SEC-007"]
    assert body["status"] == "BLOCK"


def test_security_risk_aggregation_ordering() -> None:
    # CRITICAL beats HIGH beats MEDIUM.
    assert _scan(privileged=True, host_network=True, gpu_count=99)["risk_level"] == "CRITICAL"
    # HIGH beats MEDIUM.
    assert _scan(host_network=True, gpu_count=99)["risk_level"] == "HIGH"
    # MEDIUM beats LOW.
    assert _scan(gpu_count=99)["risk_level"] == "MEDIUM"
    # No violations → LOW.
    assert _scan()["risk_level"] == "LOW"


def test_security_empty_capabilities_does_not_crash() -> None:
    assert _scan(capabilities=[])["status"] == "PASS"
    # Missing capabilities field entirely also scans cleanly.
    r = client.post("/api/security/scan", json={"name": "no-caps"})
    assert r.status_code == 200
    assert r.json()["status"] == "PASS"


def test_security_policies_endpoint() -> None:
    r = client.get("/api/security/policies")
    assert r.status_code == 200
    policies = r.json()
    assert len(policies) == 7
    assert {p["rule_code"] for p in policies} == {
        "SEC-001", "SEC-002", "SEC-003", "SEC-004", "SEC-005", "SEC-006", "SEC-007",
    }
    assert all("description" in p and "severity" in p for p in policies)


def test_security_does_not_break_existing_apis() -> None:
    # Existing endpoints keep working alongside the new security router.
    assert len(client.get("/api/workloads").json()) >= len(WORKLOADS)
    assert len(client.get("/api/nodes").json()) >= len(NODES)
    assert len(client.get("/api/decisions").json()) == len(DECISIONS)
    assert client.get("/api/schedule").status_code == 200
    assert client.get("/api/connectors/nodes").status_code == 200


# --- Security gate on workload creation (Phase 2D) -------------------------
def _workload(**overrides) -> dict:
    body = {
        "name": "gate-test",
        "team": "QA",
        "type": "Inference",
        "gpu_requested": 2,
        "gpu_type": "L4",
        "memory_gb": 64,
        "duration_hours": 4,
        "priority": "Low",
        "deadline": "2026-09-12T10:00:00Z",
        "image": "docker.io/myteam/trainer",
    }
    body.update(overrides)
    return body


def _workload_names() -> set[str]:
    return {w["name"] for w in client.get("/api/workloads").json()}


def test_gate_safe_workload_created() -> None:
    before = len(client.get("/api/workloads").json())
    r = client.post("/api/workloads", json=_workload(name="gate-safe"))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "Queued"
    assert body["security_status"] == "PASS"
    assert body["security_risk"] == "LOW"
    assert len(client.get("/api/workloads").json()) == before + 1
    assert "gate-safe" in _workload_names()


def test_gate_privileged_blocks_and_not_created() -> None:
    before = len(client.get("/api/workloads").json())
    r = client.post("/api/workloads", json=_workload(name="gate-priv", privileged=True))
    assert r.status_code == 403, r.text
    detail = r.json()["detail"]
    assert detail["status"] == "BLOCK"
    assert detail["risk_level"] == "CRITICAL"
    assert [v["rule_code"] for v in detail["violations"]] == ["SEC-001"]
    # Not persisted.
    assert len(client.get("/api/workloads").json()) == before
    assert "gate-priv" not in _workload_names()


def test_gate_host_pid_blocks_and_not_created() -> None:
    r = client.post("/api/workloads", json=_workload(name="gate-hostpid", host_pid=True))
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert [v["rule_code"] for v in detail["violations"]] == ["SEC-003"]
    assert "gate-hostpid" not in _workload_names()


def test_gate_unapproved_registry_blocks_and_not_created() -> None:
    r = client.post(
        "/api/workloads",
        json=_workload(name="gate-registry", image="evil.example.com/malware:latest"),
    )
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert [v["rule_code"] for v in detail["violations"]] == ["SEC-006"]
    assert "gate-registry" not in _workload_names()


def test_gate_excessive_gpu_blocks_and_not_created() -> None:
    r = client.post("/api/workloads", json=_workload(name="gate-gpu", gpu_requested=16))
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert [v["rule_code"] for v in detail["violations"]] == ["SEC-007"]
    assert detail["risk_level"] == "MEDIUM"
    assert "gate-gpu" not in _workload_names()


def test_gate_multiple_violations_blocks_and_not_created() -> None:
    r = client.post(
        "/api/workloads",
        json=_workload(
            name="gate-multi",
            privileged=True,
            host_network=True,
            image="evil.example.com/x:latest",
            gpu_requested=32,
        ),
    )
    assert r.status_code == 403
    detail = r.json()["detail"]
    codes = [v["rule_code"] for v in detail["violations"]]
    assert codes == ["SEC-001", "SEC-002", "SEC-006", "SEC-007"]
    assert detail["risk_level"] == "CRITICAL"
    assert "gate-multi" not in _workload_names()


def test_gate_existing_create_without_security_fields_still_works() -> None:
    # Legacy payload omitting all security fields must still create (safe defaults).
    payload = {
        "name": "gate-legacy",
        "team": "QA",
        "type": "Batch",
        "gpu_requested": 1,
        "gpu_type": "T4",
        "memory_gb": 16,
        "duration_hours": 2,
        "priority": "Low",
        "deadline": "2026-09-12T10:00:00Z",
    }
    r = client.post("/api/workloads", json=payload)
    assert r.status_code == 201, r.text
    assert r.json()["security_status"] == "PASS"
    assert "gate-legacy" in _workload_names()


# --- ML prediction API (Phase 3C) ------------------------------------------
# These use a tiny SYNTHETIC fixture model (not the Philly dataset) so the API
# contract can be tested without the ~1 GB download. Real metrics come from
# training on the real data.
import datetime as _dt  # noqa: E402
import numpy as _np  # noqa: E402

from app import ml_service  # noqa: E402

_ML_ENV_SET = False


def _make_fixture_model(tmp: str) -> None:
    """Train a tiny XGBoost on synthetic rows and point ml_service at it."""
    import xgboost as xgb
    from src.preprocess import FEATURES, build_dataset  # type: ignore

    base = _dt.datetime(2017, 10, 1, 8, 0, 0)
    jobs = []
    rng = _np.random.default_rng(0)
    for i in range(120):
        gpus = int(rng.choice([1, 2, 4, 8]))
        servers = 1 if gpus <= 4 else 2
        per = max(1, gpus // servers)
        submit = base + _dt.timedelta(hours=i)
        start = submit + _dt.timedelta(minutes=5)
        rt = 30 + gpus * 15 + float(rng.normal(0, 5))
        end = start + _dt.timedelta(minutes=rt)
        detail = [{"ip": f"m{s}", "gpus": [f"gpu{g}" for g in range(per)]} for s in range(servers)]
        jobs.append({
            "status": "Pass", "vc": "vcA" if i % 2 else "vcB", "jobid": f"j{i}",
            "submitted_time": submit.strftime("%Y-%m-%d %H:%M:%S"),
            "attempts": [{"start_time": start.strftime("%Y-%m-%d %H:%M:%S"),
                          "end_time": end.strftime("%Y-%m-%d %H:%M:%S"), "detail": detail}],
        })
    log_path = os.path.join(tmp, "cluster_job_log")
    with open(log_path, "w") as f:
        json.dump(jobs, f)
    ds = build_dataset(log_path)
    model = xgb.XGBRegressor(n_estimators=60, max_depth=3, random_state=42)
    model.fit(ds["X_train"], _np.log1p(ds["y_train"]))
    model_path = os.path.join(tmp, "m.json")
    pp_path = os.path.join(tmp, "pp.json")
    metrics_path = os.path.join(tmp, "metrics.json")
    model.save_model(model_path)
    with open(pp_path, "w") as f:
        json.dump({"dataset": "fixture", "target": "runtime_minutes", "log_target": True,
                   "features": FEATURES, "vc_freq": ds["meta"]["vc_freq"],
                   "vc_freq_default": 0, "feature_medians": ds["meta"]["feature_medians"]}, f)
    with open(metrics_path, "w") as f:
        json.dump({"dataset": "fixture", "target": "runtime_minutes",
                   "feature_importance": [{"feature": x, "importance": 1.0} for x in FEATURES]}, f)
    os.environ["MINDSOURCE_MODEL_PATH"] = model_path
    os.environ["MINDSOURCE_PREPROCESS_PATH"] = pp_path
    os.environ["MINDSOURCE_METRICS_PATH"] = metrics_path
    ml_service.reset_cache()


def test_ml_missing_model_returns_503() -> None:
    os.environ["MINDSOURCE_MODEL_PATH"] = "/no/such/model.json"
    os.environ["MINDSOURCE_PREPROCESS_PATH"] = "/no/such/pp.json"
    ml_service.reset_cache()
    r = client.post("/api/ml/predict", json={"gpu_count": 4})
    assert r.status_code == 503, r.text


def test_ml_predict_ok() -> None:
    import tempfile
    tmp = tempfile.mkdtemp()
    _make_fixture_model(tmp)
    r = client.post("/api/ml/predict", json={"gpu_count": 4})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["model"] == "XGBoost"
    assert body["target"] == "runtime_minutes"
    assert isinstance(body["prediction"], (int, float)) and body["prediction"] >= 0
    assert len(body["top_features"]) >= 1


def test_ml_predict_validation_error() -> None:
    r = client.post("/api/ml/predict", json={"gpu_count": 0})  # below ge=1
    assert r.status_code == 422


def test_ml_model_info() -> None:
    r = client.get("/api/ml/model")
    assert r.status_code == 200
    assert r.json()["available"] is True  # fixture model set by prior test


# --- Decision Engine (Phase 3C) --------------------------------------------
from app import decision_engine as _de  # noqa: E402
from app.decision_engine import Candidate  # noqa: E402


def _pools(h100_avail=4, a100_avail=6, l4_avail=3, t4_avail=8):
    return [
        Candidate("H100", "H100", 4, 16, h100_avail, 60, "simulated"),
        Candidate("A100", "A100", 3, 16, a100_avail, 40, "simulated"),
        Candidate("L4", "L4", 2, 16, l4_avail, 55, "simulated"),
        Candidate("T4", "T4", 1, 16, t4_avail, 20, "simulated"),
    ]


def test_de_candidate_scoring() -> None:
    rec = _de.recommend(2, _pools(), predicted_runtime_min=600)  # long -> tier 4
    assert rec.recommended_resource is not None
    assert all(0.0 <= c.score <= 1.0 for c in rec.candidates)
    # Recommended must be eligible.
    chosen = next(c for c in rec.candidates if c.resource == rec.recommended_resource)
    assert chosen.eligible


def test_de_capacity_filtering_and_ineligible_not_recommended() -> None:
    # Request 8 GPUs; only pools with >=8 available are eligible.
    pools = _pools(h100_avail=2, a100_avail=2, l4_avail=2, t4_avail=8)
    rec = _de.recommend(8, pools, predicted_runtime_min=10)
    chosen = next(c for c in rec.candidates if c.resource == rec.recommended_resource)
    assert chosen.eligible and chosen.available >= 8
    assert rec.recommended_resource == "T4"  # only eligible one
    ineligible = [c for c in rec.candidates if not c.eligible]
    assert all(c.resource != rec.recommended_resource for c in ineligible)


def test_de_recommendation_changes_with_availability() -> None:
    # Long job -> prefers H100 (tier 4) when available.
    rec1 = _de.recommend(2, _pools(h100_avail=8), predicted_runtime_min=600)
    assert rec1.recommended_resource == "H100"
    # Remove H100 availability -> recommendation must change.
    rec2 = _de.recommend(2, _pools(h100_avail=0), predicted_runtime_min=600)
    assert rec2.recommended_resource != "H100"


def test_de_recommendation_changes_with_prediction() -> None:
    # Short job right-sizes toward a lower tier; long job toward a higher tier.
    short = _de.recommend(2, _pools(), predicted_runtime_min=10)
    long = _de.recommend(2, _pools(), predicted_runtime_min=600)
    assert short.recommended_resource != long.recommended_resource
    assert _de.needed_tier(10) == 1 and _de.needed_tier(600) == 4


def test_de_deterministic() -> None:
    a = _de.recommend(2, _pools(), predicted_runtime_min=100)
    b = _de.recommend(2, _pools(), predicted_runtime_min=100)
    assert a.recommended_resource == b.recommended_resource
    assert [c.score for c in a.candidates] == [c.score for c in b.candidates]


def test_de_explanation_and_ranking() -> None:
    rec = _de.recommend(2, _pools(), predicted_runtime_min=600)
    assert len(rec.explanation) >= 2
    chosen = next(c for c in rec.candidates if c.resource == rec.recommended_resource)
    assert len(chosen.reasons) >= 1
    # Candidates are ranked by score descending.
    scores = [c.score for c in rec.candidates]
    assert scores == sorted(scores, reverse=True)


def test_de_no_eligible_candidate() -> None:
    rec = _de.recommend(64, _pools(), predicted_runtime_min=100)  # nothing has 64
    assert rec.recommended_resource is None
    assert any("No candidate" in e for e in rec.explanation)


# --- Decision API + workload integration -----------------------------------
def test_recommend_api() -> None:
    r = client.post("/api/decisions/recommend", json={"gpu_requested": 2})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["recommended_resource"] in {"H100", "A100", "L4", "T4"} or body[
        "recommended_resource"
    ] is not None
    assert len(body["candidates"]) >= 4
    assert len(body["explanation"]) >= 1


def test_workload_create_includes_recommendation() -> None:
    r = client.post("/api/workloads", json=_workload(name="rec-flow", gpu_requested=2))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["security_status"] == "PASS"
    assert body["resource_recommendation"] is not None
    assert body["resource_recommendation"]["recommended_resource"] is not None


def test_blocked_workload_gets_no_recommendation() -> None:
    r = client.post(
        "/api/workloads",
        json=_workload(name="rec-blocked", gpu_requested=2, privileged=True),
    )
    assert r.status_code == 403
    # 403 body carries only the security detail — no ML/recommendation fields.
    text = r.text
    assert "resource_recommendation" not in text
    assert "recommended_resource" not in text


# --- What-if simulation (Phase 4) ------------------------------------------
def _db_counts() -> tuple[int, int]:
    return (
        len(client.get("/api/workloads").json()),
        len(client.get("/api/decisions").json()),
    )


def test_whatif_safe_runs_full_pipeline() -> None:
    r = client.post("/api/what-if", json={"gpu_requested": 2})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["persisted"] is False
    assert body["security"]["status"] == "PASS"
    rec = body["recommendation"]
    assert rec is not None
    assert rec["recommended_resource"] is not None
    assert len(rec["candidates"]) >= 4
    # ML prediction flowed into the Decision Engine (fixture model set earlier).
    assert rec["prediction"] is not None


def test_whatif_blocked_stops_before_ml_and_decision() -> None:
    r = client.post(
        "/api/what-if", json={"gpu_requested": 2, "privileged": True}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["security"]["status"] == "BLOCK"
    assert any(v["rule_code"] == "SEC-001" for v in body["security"]["violations"])
    # No ML, no Decision Engine for a blocked hypothetical.
    assert body["recommendation"] is None


def test_whatif_does_not_persist() -> None:
    before = _db_counts()
    client.post("/api/what-if", json={"gpu_requested": 2})
    client.post("/api/what-if", json={"gpu_requested": 4, "privileged": True})
    after = _db_counts()
    assert after == before  # no workloads or decisions created


def test_whatif_gpu_request_affects_eligibility() -> None:
    # Request 8 GPUs: only pools with >=8 available are eligible (seed: T4).
    r = client.post("/api/what-if", json={"gpu_requested": 8})
    rec = r.json()["recommendation"]
    eligible = [c for c in rec["candidates"] if c["eligible"]]
    assert all(c["available"] >= 8 for c in eligible)
    assert rec["recommended_resource"] is not None


def test_whatif_eligibility_flags_honest() -> None:
    # Request 4 (passes security): pools with <4 available are ineligible and
    # never recommended (seed: H100 avail 2 -> ineligible; T4 avail 13 -> ok).
    r = client.post("/api/what-if", json={"gpu_requested": 4})
    rec = r.json()["recommendation"]
    by = {c["gpu_type"]: c for c in rec["candidates"]}
    assert by["H100"]["eligible"] is False
    assert by["T4"]["eligible"] is True
    chosen = next(c for c in rec["candidates"] if c["resource"] == rec["recommended_resource"])
    assert chosen["eligible"] is True
    # The pure no-eligible case is covered by test_de_no_eligible_candidate.


def test_whatif_deterministic() -> None:
    a = client.post("/api/what-if", json={"gpu_requested": 2}).json()
    b = client.post("/api/what-if", json={"gpu_requested": 2}).json()
    assert a["recommendation"]["recommended_resource"] == b["recommendation"][
        "recommended_resource"
    ]
    assert [c["score"] for c in a["recommendation"]["candidates"]] == [
        c["score"] for c in b["recommendation"]["candidates"]
    ]


def test_whatif_model_unavailable_no_fabricated_prediction() -> None:
    # Point at a missing model: prediction must be null (never fabricated); the
    # Decision Engine still ranks by real availability.
    prev_model = os.environ.get("MINDSOURCE_MODEL_PATH")
    prev_pp = os.environ.get("MINDSOURCE_PREPROCESS_PATH")
    os.environ["MINDSOURCE_MODEL_PATH"] = "/no/such/model.json"
    os.environ["MINDSOURCE_PREPROCESS_PATH"] = "/no/such/pp.json"
    ml_service.reset_cache()
    try:
        body = client.post("/api/what-if", json={"gpu_requested": 2}).json()
        assert body["security"]["status"] == "PASS"
        assert body["recommendation"]["prediction"] is None
    finally:
        if prev_model:
            os.environ["MINDSOURCE_MODEL_PATH"] = prev_model
        if prev_pp:
            os.environ["MINDSOURCE_PREPROCESS_PATH"] = prev_pp
        ml_service.reset_cache()


def _run_all() -> None:
    # Preserve definition order (matches pytest) so mutating tests run after the
    # count-based checks that depend on the pristine seed.
    tests = sorted(
        (v for k, v in globals().items() if k.startswith("test_") and callable(v)),
        key=lambda f: f.__code__.co_firstlineno,
    )
    passed = 0
    for t in tests:
        t()
        print(f"  PASS  {t.__name__}")
        passed += 1
    print(f"\n{passed}/{len(tests)} checks passed.")


if __name__ == "__main__":
    _run_all()
