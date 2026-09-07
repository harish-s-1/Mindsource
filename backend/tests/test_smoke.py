"""Import + endpoint smoke checks for the MINDSource backend.

Runnable directly (`python tests/test_smoke.py`) or under pytest. Uses an
isolated temporary SQLite database so it never touches the dev database.
"""

from __future__ import annotations

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
